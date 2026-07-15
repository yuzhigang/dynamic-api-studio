# 动态 API 发布态运行时设计（Part B：发布态运行时 + 发现）

## 背景

Part A（已合并到 `main`）实现了可复用的 API 执行引擎 `src/server/workflow/`：`runWorkflow(apiDefinition, inputValues, globalValues, deps, options) → WorkflowRunResult`，按工作流顺序执行 sql-query / js-transform 步骤，返回 `role="assemble"` 步骤的输出。它的第一个消费者是设计器的试运行面板（`api-test.service`）。

Part B 把 `status="published"` 的 API 定义接成**真实可调用的 HTTP 端点**：外部请求 → 按 `(path, method)` 找到 published 定义 → 抽请求参数 → 调 Part A 的 `runWorkflow` → 返回 assemble 输出。`draft` 的定义不挂路由（调到 404）。再提供一个 OpenAPI 端点聚合所有 published API 供发现。

## 范围与约束

### 本 spec 范围（Part B）

- 发布态运行时：把 published 定义挂成可调用 Hono 路由（zod-openapi），live handler 调用 Part A 引擎。
- OpenAPI 端点：聚合所有 published API 的 OpenAPI 文档。
- 兑现 Part A spec §8.2 的 Part B 契约承诺。

### 已确认的设计约束

| 约束 | 决定 |
| ---- | ---- |
| URL 形态 | 按字面 `path` 提供（如 `POST /api/v1/order/query`），与管理路由 `/api/{projects,datasources,...}` 共存于 `/api` 下（published 用 `/api/v1/*`，不冲突）。`(path, method)` 全局唯一，发布时校验。 |
| 分发 + OpenAPI | zod-openapi：内层 OpenAPIHono 注册 published 路由（路由即 OpenAPI 来源，不漂移）；**同步重建**——稳定外层委托 + 可热替换内层引用，publish 时整批重建。 |
| 重建机制 | Hono 路由只追加、无逐条移除；用"整批重建内层 app + 换引用"绕过，不用屏蔽中间件。重建毫秒级。 |
| 响应体 | 成功直接返回 assemble 输出（**无信封**），OpenAPI responseSchema 即它本身。 |
| 鉴权 | v1 不做（`permissions` 字段保留）；zod-openapi per-route 中间件为将来鉴权留缝。 |
| 校验归属 | zod-openapi 只负责描述 + 路由；运行时校验走 `runWorkflow` 内部的 `validateInput`（错误格式统一）。 |

---

## 1. 总览与模块布局

Part B 是 Part A 引擎的第二个消费者。新域 `server/domains/api-runtime/`（与 `api-test` 平级）：

| 文件 | 职责 |
| ---- | ---- |
| `published-router.ts` | 持有可变 `currentPublishedApp: OpenAPIHono` + `rebuildPublishedRouter()` + `getPublishedApp()` |
| `definition-to-openapi.ts` | 翻译器：`ApiDefinitionDraft` → zod query/body/header schema + response schema + OpenAPI metadata |
| `request-param-extractor.ts` | 按 `requestParams.location` + `bodyContentType` 从 Hono 请求抽 `inputValues`（含标量强转） |
| `live-handler.ts` | 单路由处理器：抽参 → `loadGlobalValues` → `runWorkflow` → 按 `error.code` 映射 HTTP → 返 assemble 输出 |
| 各模块 `*.test.ts` | 单测 |

**仓库扩展**（`server/domains/api-definition/`）：
- `repository.listPublished(): ApiDefinitionDraft[]` — 跨项目返回所有 `status="published"` 的完整 draft。
- `repository.isPathMethodUnique(path, method, exceptId?): boolean` — 发布时校验 `(path, method)` 全局唯一。

**路由接线**：[app.ts](src/server/app.ts) 管理路由之后加外层委托；[project-api.route.ts](src/server/routes/project-api.route.ts) 的 save 处理后调 `rebuildPublishedRouter()`。

---

## 2. 分发与重建模型

**外层稳定挂载点**（注册一次，不动）——在 [app.ts](src/server/app.ts) 管理路由之后：

```ts
app.all('/*', (c) => getPublishedApp().fetch(c.req.raw, c.env))
```

管理路由（`/projects`、`/datasources`、`/sql`…）先匹配；未命中的 `/api/*` 落到外层委托，交给内层 published app。外层在 `basePath('/api')` 下，`/*` 匹配相对路径；委托时传 `c.req.raw`（原始请求，字面 path 如 `/api/v1/order/query`）。

**内层可变引用**：

```ts
// server/domains/api-runtime/published-router.ts
let currentPublishedApp: OpenAPIHono = new OpenAPIHono()

export function getPublishedApp(): OpenAPIHono {
  return currentPublishedApp
}

/** 用当前所有 published 定义构建全新内层 OpenAPIHono，换引用。毫秒级、无 drift。 */
export function rebuildPublishedRouter(deps, services): void {
  const app = new OpenAPIHono()
  for (const def of apiDefinitionRepository.listPublished()) {
    registerPublishedRoute(app, def, deps, services)
  }
  app.doc('/api/openapi', { openapi: { info: { title: 'Dynamic API Studio', version: '1.0.0' } } })   // OpenAPI 文档端点（见 §4）
  currentPublishedApp = app
}

// registerPublishedRoute(app, def, deps, services)（同在 published-router.ts）：
// 用翻译器（§4.1）的 zod schema 构建路由 spec，绑定 liveHandler（§3.2）为处理器，注册到内层 OpenAPIHono。
```

内层 OpenAPIHono **无 basePath**，路由用字面绝对 path（`/api/v1/order/query`、`/api/openapi`）匹配 `c.req.raw`。

**重建触发**：服务启动构建一次；每次 api-definition save 后调 `rebuildPublishedRouter()`（无脑重建，毫秒级，最简且正确——避免"只在 status 变化时重建"的状态追踪复杂度）。重建只换引用，并发请求读到旧或新 app 都合法，无需锁。

---

## 3. Live handler + 参数抽取

### 3.1 参数抽取（`request-param-extractor.ts`）

```ts
extractInputValues(c: Context, requestParams: RequestParam[], bodyContentType: string): Record<string, unknown>
```

- `location === 'query'` → `c.req.query(name)`
- `location === 'header'` → `c.req.header(name)`
- `location === 'body'` → 按 `bodyContentType` 解析后按 name 取值：
  - `json` → `await c.req.json()`
  - `x-www-form-urlencoded` / `form-data` → `await c.req.parseBody()`
- **标量强转**：query/header 到的都是字符串，按 `param.type` 强转（`integer`/`decimal`→`Number`，`boolean`→`'true'/'false'`→`boolean`，`string`→原样）——否则 Part A 的 `validateInput`（严格 `typeof`）会把 `"7"` 判成类型不符。body（json）值已类型化，原样取。`array`/`object` 经 query 传来时 best-effort `JSON.parse`（边角，v1 不重点优化）。

### 3.2 Live handler（`live-handler.ts`）

每个 published 路由注册的处理器，闭包持有 `deps` + `services`（与服务试运行面板共用同一套实例）：

```ts
async function liveHandler(c: Context, def: ApiDefinitionDraft, deps, services): Promise<Response> {
  const inputValues = extractInputValues(c, def.requestParams, def.bodyContentType)
  const globalValues = loadGlobalValues(def.projectId, services)
  const run = await runWorkflow(def, inputValues, globalValues, deps, { onLog })

  if (run.status === 'success') {
    return c.json(run.response, 200)
  }
  const status = run.error?.code === 'INVALID_INPUT' ? 400 : 500
  return c.json({ code: run.error?.code, message: run.error?.message, details: run.error?.details }, status)
}
```

- 成功 → **200**，body = `run.response`（assemble 输出，无信封）。
- 失败 → status 由 `error.code` 定（`INVALID_INPUT`→400，`STEP_FAILED`/`ASSEMBLE_MISSING`/`WRITE_ACROSS_DATASOURCES`→500），body = `{ code, message, details? }`（错误对象，非数据信封；与 Part A 消费者一致）。
- `onLog` 接 log-query 域的落库缝——v1 先接一个简单 logger（console），完整执行日志持久化推迟。

---

## 4. OpenAPI 端点 + 翻译器

### 4.1 翻译器（`definition-to-openapi.ts`）

`ApiDefinitionDraft` → 每条路由的 zod schema + OpenAPI metadata：
- `requestParams` 按 location 拆成 query / header / body 三个 zod 对象（`scalarType` → 对应 zod 类型；`required` → `.optional()` 与否）。
- `responseSchema`（`SchemaField[]` 树）→ response zod 对象（嵌套对象/数组）。
- `name` → OpenAPI `summary`，`description` → `description`，`tags` → `tags`。

zod-openapi 用这些 schema 注册路由 + 生成文档；**运行时校验仍走 `runWorkflow` 内部的 `validateInput`**（错误格式统一），zod-openapi 只负责描述 + 路由。

### 4.2 OpenAPI 端点

内层 OpenAPIHono 用 zod-openapi 的 `app.doc('/api/openapi', ...)` 注册文档路由。`GET /api/openapi` → 外层委托 → 内层 doc 路由 → 返回 OpenAPI JSON：
- `paths` = 各 published API 的字面 path（如 `/api/v1/order/query`），每个 path 下对应 method 的 operation。
- `parameters` / `requestBody` / `responses` 由翻译器从 `requestParams` / `responseSchema` 生成。
- 重建时文档自动更新（新内层 app = 新文档）。

---

## 5. 唯一性与重建触发

- **发布时唯一性校验**：save 的 status 为 `published` 时调 `repository.isPathMethodUnique(path, method, exceptId?)`，冲突 → **409** `{ message: 'path+method 已被其他已发布 API 占用' }`。
- **重建触发**：服务启动构建一次；每次 api-definition save 后无脑调 `rebuildPublishedRouter()`（毫秒级，最简且正确）。

---

## 6. 边界与错误处理

| 场景 | 行为 |
| ---- | ---- |
| draft 被调 | 不注册路由 → 内层 404（重建模型的自然结果） |
| 未知 path | 外层委托 → 内层 404 |
| 方法不匹配（GET 打 POST-only 路由） | 内层 404（v1 不细分 405） |
| 发布时 path+method 冲突 | 409 |
| INVALID_INPUT | 400 `{ code, message, details }` |
| STEP_FAILED / ASSEMBLE_MISSING / WRITE_ACROSS_DATASOURCES | 500 `{ code, message, details? }` |
| handler 未预期抛错 | 外层 `app.onError` 兜底 500 |
| 404 形状 | 未知 `/api/v1/*` 走外层委托到内层 404，与管理路由 `notFound` 形状略有差异——v1 接受（Minor） |

重建只换引用，并发请求读到旧或新 app 都合法，无需锁。

---

## 7. 测试策略

- **`definition-to-openapi.test.ts`**：样例 def → 断言 zod query/body/header/response schema + OpenAPI metadata；边角（无 body 参数、responseSchema 树）。
- **`request-param-extractor.test.ts`**：mock Hono context → 断言按 location 抽取 + 标量强转（integer/boolean/string）+ body 按 content type（json/form）+ 缺失可选参数。
- **`live-handler.test.ts`**：stub `runWorkflow` → 断言 success(200 + raw response)、INVALID_INPUT(400)、STEP_FAILED(500)、错误体形状。
- **`published-router.test.ts`**：从几条 published def 构建内层 app → 断言 published path 命中 handler、draft/未知 404；**重建**反映增删（publish 新定义 → 重建 → 新路由生效；unpublish → 重建 → 404）；OpenAPI 文档含 published paths。用真实 OpenAPIHono + stubbed handler。
- **`api-definition.repository.test.ts`**（扩展）：`listPublished()` 只返 published；`isPathMethodUnique` true/false。
- **集成**：save 触发重建——save 后 published 路由出现/消失。

---

## 8. 延后项与 Part A 契约关系

### 8.1 明确延后（v1 不做）

- 鉴权 / permissions（`permissions` 字段保留；per-route 中间件留缝）。
- 执行日志持久化到 log-query 域（v1 onLog → 简单 logger）。
- 405 Method Not Allowed（v1 统一 404）。
- query array/object 参数的健壮解析（v1 best-effort `JSON.parse`）。
- 响应严格 schema 校验（Part A 已是轻量校验 + 透传，live 返 raw）。
- published path 里的路径参数（`requestParams` 无 `path` location，published path 是静态字面量；动态路径参数推迟）。
- 持久化层（仓库仍内存 seed；将来落 DB 时 Part B 读同一仓库接口，无需改设计）。

### 8.2 与 Part A 契约的关系

live handler 是引擎的**第二个消费者**（第一个是 Part A 的试运行面板），调用完全相同的 `runWorkflow(def, inputValues, globalValues, deps, options)` + `loadGlobalValues(projectId, services)`；`validateInput` 内置于 `runWorkflow`，live path 免费拿到输入校验 + 统一错误格式；`deps`（knexRegistry/getDataSource/analyzer）共用实例；`onLog` 接日志缝。

兑现 Part A spec §8.2 的承诺：解析定义（by path+method）→ 抽 inputValues（by location）→ `loadGlobalValues` → `runWorkflow` → 按 `error.code` 映射 HTTP → 返 `response` 为 body。
