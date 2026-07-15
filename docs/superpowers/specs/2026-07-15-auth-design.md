# 动态 API 鉴权设计（Auth + Authorization）

## 背景

Part A（执行引擎 `server/workflow/`）与 Part B（发布态运行时 `server/domains/api-runtime/`）已合并到 `main`，published API 可被外部按 `path+method` 调用，但**完全开放、无鉴权**——`app.ts` 只有 logger+cors，没有任何身份/用户系统。`ApiDefinitionDraft.permissions: string[]` 字段已存在（如 `['order.read']`）却从未被使用。

本设计给 Part B 的 published 路由加鉴权：解 token 拿到用户及其 permissions，按每个 API 的 `requireAuth`/`permissions` 判定 **401**（需登录未登录）/ **403**（登录但无权限）/ 放行。v1 自包含（内存用户 + 登录 + session token）；未来迁到 OIDC 时**只换"验 token → userId"这一环**，授权逻辑不变。

## 范围与约束

### 本 spec 范围

- 身份：内存 seed 用户 + `POST /api/auth/login` 换不透明 token + 内存 session 表。
- 授权：published 路由的 `requireAuth` + `permissions`（任意命中）检查。
- 可替换缝 `AuthDeps`，为未来 OIDC 预留。

### 已确认的设计约束

| 约束 | 决定 |
| ---- | ---- |
| 身份模型（v1） | 内存 seed 用户 + 登录换不透明 token + 内存 session 表。自包含、可端到端测、无外部依赖。 |
| 未来演进 | 改用 OIDC（专门认证服务器签发 token，本平台验签）。`verifyToken`/`getPermissions` 做成可替换缝。 |
| 授权模型 | 每个 API 加 `requireAuth: boolean` + 已有 `permissions: string[]`（任意命中即放行）。 |
| `requireAuth` 默认 | `true`（secure-by-default）；seed 的 4 个 published demo 显式标 `false` 保持开放。 |
| 作用范围 | 只鉴权 published 路由；管理 API（CRUD 定义/数据源等）v1 不鉴权。 |
| 用户权限形态 | 扁平 `permissions: string[]`（角色→权限留作未来）。 |
| token 形态 | 不透明 token + 内存 `token→userId` 表。登录端点+发 token 为 v1 一次性代码，未来 OIDC 弃用。 |
| 错误顺序 | auth-guard 在 `liveHandler` 内调（zod 请求校验之后）→ 未登录+输入非法时 **400 先于 401**（v1 接受）。 |

---

## 1. 总览、可替换缝、模块布局

Auth 子系统 = 身份（谁在调、怎么证明、permissions 哪来）+ 授权（按 API 的 `requireAuth`/`permissions` 判定）。`auth-guard` 只依赖 `AuthDeps` 接口，不依赖具体实现 → v1/未来可换。

### 可替换缝

```ts
type AuthDeps = {
  verifyToken(token: string): string | undefined   // v1: session 表查 userId；未来: 验 OIDC JWT 取 sub
  getPermissions(userId: string): string[]          // v1: 用户表；未来: 按 OIDC subject 本地映射
}
```

### 新域 `server/domains/auth/`

| 文件 | 职责 |
| ---- | ---- |
| `user.repository.ts` | 内存 seed 用户 `{id, username, password, permissions}`；`findByCredentials`/`getPermissions` |
| `auth-session.store.ts` | 内存 `token→userId` 表；`issue(userId)→token`/`verify(token)→userId \| undefined` |
| `auth-guard.ts` | `authorize(c, def, authDeps): Response \| undefined`（401/403/放行） |
| `auth.route.ts` | `POST /api/auth/login` {username, password} → {token} |
| `auth.contract.ts` | login zod schema + `AuthDeps` 类型 + 401/403 错误体类型 |
| `*.test.ts` | 各模块单测 |

### 改动现有文件

- `api-definition.schema.ts` — 加 `requireAuth: z.boolean().default(true)`
- `create-empty-api-definition.ts` — 新建 API 默认 `requireAuth: true`
- `api-definition.repository.ts` — 4 个 published demo seed 显式 `requireAuth: false`
- `live-handler.ts` — 开头调 `authorize`，未放行直接返 401/403；签名加 `authDeps`
- `published-router.ts` / `runtime-wiring.ts` — 透传 `authDeps`
- `app.ts` — 挂 `/api/auth` 路由
- `definition-to-openapi.ts` — `requireAuth` 时加 401/403 响应
- Part B 测试 helper（`publishedDef`）— 标 `requireAuth: false`，现有分发测试保持匿名放行

---

## 2. 身份：用户表 + session + 登录

### 用户表 `user.repository.ts`

```ts
export type User = { id: string; username: string; password: string; permissions: string[] }

const seedUsers: User[] = [
  { id: 'u_admin',  username: 'admin',  password: 'admin',  permissions: ['order.read','order.write','customer.read','product.read','stock.read','report.read'] },
  { id: 'u_viewer', username: 'viewer', password: 'viewer', permissions: ['order.read'] },
]

export class UserRepository {
  findByCredentials(username: string, password: string): User | undefined
  getPermissions(userId: string): string[]
}
```

`viewer` 用于验 403（有 token 但无对应 permission）。

### session 表 `auth-session.store.ts`

```ts
export class AuthSessionStore {
  issue(userId: string): string          // crypto.randomUUID() 生成不透明 token，存 token→userId
  verify(token: string): string | undefined
}
```

v1 不做 revoke/logout（YAGNI）。token 不过期（demo 用）。

### 登录端点 `auth.route.ts`

```ts
POST /api/auth/login   body: { username: string, password: string }
  → 200 { token }            （findByCredentials 成功 → sessionStore.issue(user.id)）
  → 401 { code:'UNAUTHORIZED', message:'用户名或密码错误' }
```

挂在 `app.ts` 的 `/api/auth`（管理侧平台端点，**不是** published 路由）。**此端点为 v1 一次性代码**，未来 OIDC 接管后弃用。登录与 authDeps 必须共用同一个 `AuthSessionStore` 实例（登录发的 token 才能被 authDeps.verify 验证）。

### AuthDeps 装配（`runtime-wiring.ts`）

```ts
const authDeps: AuthDeps = {
  verifyToken: (t) => authSessionStore.verify(t),
  getPermissions: (id) => userRepository.getPermissions(id),
}
```

透传给 published-router → liveHandler。未来换 OIDC 时只替换这个 `authDeps`。

---

## 3. 授权：auth-guard

```ts
export function authorize(c: Context, def: ApiDefinitionDraft, authDeps: AuthDeps): Response | undefined {
  if (!def.requireAuth) return undefined                              // 公开，放行
  const header = c.req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined
  const userId = token ? authDeps.verifyToken(token) : undefined
  if (!userId) return c.json({ code: 'UNAUTHORIZED', message: '需要登录' }, 401)
  if (def.permissions.length === 0) return undefined                  // 任意已登录用户
  const userPerms = authDeps.getPermissions(userId)
  if (def.permissions.some((p) => userPerms.includes(p))) return undefined  // 任意命中，放行
  return c.json({ code: 'FORBIDDEN', message: '权限不足' }, 403)
}
```

| API 配置 | 未登录 | 已登录无对应 permission |
|---|---|---|
| `requireAuth: false` | 放行 | 放行 |
| `requireAuth: true` + `permissions: []` | 401 | 放行（登录即可） |
| `requireAuth: true` + `permissions: ['x']` | 401 | 403 |

token 从 `Authorization: Bearer <token>` 头取。401/403 体 `{ code, message }`（与引擎错误体形状一致）。

### live-handler 接入

`live-handler.ts` 签名加 `authDeps`，开头：
```ts
const denied = authorize(c, def, authDeps)
if (denied) return denied
// …原有 runWorkflow 逻辑
```
`authDeps` 经 `registerPublishedRoute`/`rebuildPublishedRouter` 透传。

---

## 4. schema / seed 改动 + 接线

- `api-definition.schema.ts`：加 `requireAuth: z.boolean().default(true)`。
- `create-empty-api-definition.ts`：新建 API 默认 `requireAuth: true`（secure-by-default）。
- `api-definition.repository.ts` seed：4 个 published demo（`api_order_query`/`api_order_detail`/`api_product_query`/`api_report_internal`）显式 `requireAuth: false`；2 个 draft 继承默认（未发布无影响）。
- `runtime-wiring.ts`：加 `userRepository`、`authSessionStore`，组装 `authDeps`，并入共享实例。
- `published-router.ts`：`rebuildPublishedRouter(deps, services, repository, authDeps)` + `registerPublishedRoute(app, def, deps, services, authDeps)`。
- `live-handler.ts`：签名 `liveHandler(c, def, deps, services, authDeps)`，开头调 `authorize`。
- `app.ts`：挂 `authRoute` 于 `/api/auth`（共享 runtime-wiring 的 userRepo/sessionStore）。
- `project-api.route.ts`：save 后 `rebuildPublishedRouter(...)` 调用补 `authDeps`。

---

## 5. OpenAPI 鉴权文档

- `definition-to-openapi.ts`：`def.requireAuth` 时给路由 `responses` 加 `401`/`403`（错误体 `{code, message}`），与现有 200/400/500 并列。
- `published-router.ts` 的 `app.doc('/api/openapi', { openapi: '3.0.0', info, components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } } })` 加全局 bearer 安全方案。
- per-route `security` 标注若 `createRoute` 支持 则加 `security: [{ bearerAuth: [] }]`（requireAuth 时），否则 v1 不做（401/403 响应已暗示需鉴权）。

---

## 6. 错误处理与顺序

- 401（`UNAUTHORIZED`）：`requireAuth` 但无/无效 token；登录凭据错误。
- 403（`FORBIDDEN`）：有效 token 但 `permissions` 未命中。
- 体统一 `{ code, message }`。
- **顺序**：zod-openapi 请求校验在 handler 之前 → auth-guard 在 handler 内 → 故 **400（输入非法）先于 401（未登录）**。v1 接受（OpenAPI 文档公开，输入格式不敏感；handler-call 最简且天然支持同 path 不同 method）。auth 优先（401 先于 400）需把 auth 提到 zod 前的中间件，更复杂且 `app.use(path, mw)` 对同 path 不同 method 多 def 会冲突——v1 不做。
- 与 Part B 现有错误叠加：zod 400（输入）→ auth 401/403（鉴权）→ 引擎 500/200（执行）。auth-guard 在 runWorkflow 之前。

---

## 7. 测试策略

- `user.repository.test.ts`：`findByCredentials` 成功/失败；`getPermissions`。
- `auth-session.store.test.ts`：`issue` 返 token；`verify` 已发 token 返 userId、未知 token 返 undefined。
- `auth-guard.test.ts`：requireAuth false→放行；true 无 token→401；无效 token→401；有效 token+空 permissions→放行；有效 token+命中→放行；有效 token+未命中→403（mock `c` + `authDeps`）。
- `auth.route.test.ts`：login 正确凭据→200 `{token}`（且该 token 能被 `authDeps.verifyToken` 验证）；错误凭据→401。
- `live-handler.test.ts`（扩展）：requireAuth true 路由——无 token→401、有效 token+命中→200、有效 token+未命中→403；requireAuth false→200（无 token）。
- Part B 测试 helper（`publishedDef`）标 `requireAuth: false`，现有分发测试保持匿名放行。
- 集成：login 得 token → 带 token 调 requireAuth-true published 路由→200；不带→401。

---

## 8. 延后项与 Part A/B 关系

### 8.1 明确延后（v1 不做）

- OIDC token 验签（`verifyToken` 缝已留，未来实现）。
- 角色→权限（v1 扁平 permissions）。
- 管理 API 鉴权（v1 只 published 路由）。
- logout/revoke、token 过期/刷新、密码哈希（v1 seed 明文、不过期、不注销——demo 用）。
- auth 优先于输入校验（v1 auth 后置，400 先于 401）。
- per-route OpenAPI `security` 标注（若 `createRoute` 不支持）。

### 8.2 与 Part A/B 的关系

- 鉴权作用于 Part B 的 published 路由：`liveHandler` 开头调 `authorize`（在 `runWorkflow` 之前），未放行直接 401/403，不进引擎。
- `authDeps` 经 `runtime-wiring`（Part B 的共享装配）注入 published-router → liveHandler，与 `runtimeDeps`/`runtimeServices` 同源。
- 登录端点 `/api/auth/login` 是新管理侧端点（挂 `app.ts`），与 Part B 的 published 分发正交。
- 兑现 Part B spec §8.1 的"鉴权 / permissions 推迟"——现在补上；zod-openapi per-route 中间件缝被 liveHandler 内调 `authorize` 的方式利用（handler-call，非 `app.use` 中间件，规避同 path 不同 method 冲突）。
