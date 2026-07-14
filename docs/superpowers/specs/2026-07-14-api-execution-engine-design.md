# 动态 API 执行引擎设计（Part A：执行引擎）

## 背景

Dynamic API Studio 的核心是「把一份 API 定义 + 实际请求参数运行为一个 HTTP 响应」。当前后端已具备：

- `server/analyzer/`：增强 SQL 解析为 `CompiledSqlPlan`，`renderFromPlan(plan, {input, global, local})` 渲染为 `{sql, params}`。
- `server/workflow/workflow-runner.ts`：工作流编排骨架，按顺序遍历步骤、求值 `condition`、把结果写入 `local` 作用域，但 `executeStep` 抛「未实现」。
- `server/workflow/variable-context-builder.ts`：按 input/global/local + local 变量拓扑构建 `VariableContext`。
- `server/domains/api-test/api-test.service.ts`：试运行面板，但**绕过 runner**、只跑第一个 sql-query 步骤、直接 `knex.raw`，且对 mysql/mssql 的结果形状未做归一化、全局变量未加载、`$var!` 默认值未生效。

本设计补齐「执行引擎」这一层：可复用的运行时，按工作流顺序执行 sql-query / js-transform 步骤，处理多数据源、写事务、变量绑定、结果组装、错误与日志，先被试运行面板消费，后续被发布态调用入口（Part B）复用。

## 范围与约束

### 本 spec 范围（Part A）

- 可复用的执行引擎，落地在 `server/workflow/`。
- 试运行入口（`/api/.../test`）作为第一个真实消费者，替换 `api-test.service` 的单步 hack。
- 接口与思路为 Part B（发布态 Hono 路由 + OpenAPI 端点）留好一致契约。

### 已确认的设计约束

| 约束 | 决定 |
| ---- | ---- |
| 响应组装 | 每个工作流有且仅有一个 `role="assemble"` 步骤，其 `outputVariable` 值即响应体；`responseSchema` 校验/整形它；其余步骤为中间计算。前端已保证 assemble 始终存在、为最后一步、不可删除。 |
| JS 运行时 | `new Function` 轻量沙箱，多语句 + 显式 `return`，注入 input/global/local；同步、无网络。与 design.md §649、现有 expression-evaluator 一致，面向受信实施人员。 |
| 事务/写 | 查询类可跨数据源、每步独立 autocommit；写操作支持多步，但写步骤必须共用同一 `datasourceId`（需校验），并在单个 knex 事务中执行（结尾 commit、失败 rollback）。 |
| 读写判定 | 用 analyzer 已解析的 AST 语句类型自动判定（SELECT→读；INSERT/UPDATE/DELETE/其它→写），不新增字段。 |
| Schema 前定 | input schema（`requestParams`）与 output schema（`responseSchema`）设计期固定：执行前校验输入、assemble 输出按 responseSchema 校验、Plan 缓存 key 稳定、OpenAPI 可生成。 |

---

## 1. 总览与模块布局

执行引擎把 `ApiDefinitionDraft` + 实际请求参数变成响应体的运行时。今天只被试运行面板消费；将来发布态调用入口复用同一引擎。

模块落地在 `server/workflow/`（并相应更新 CLAUDE.md 结构描述——执行器上移到 `server/workflow/`，可复用，不再放在 `domains/api-test/` 下）：

| 文件 | 状态 | 职责 |
| ---- | ---- | ---- |
| `workflow-runner.ts` | 已存在，扩展 | 编排循环 |
| `variable-context-builder.ts` | 已存在 | 构建 `VariableContext` |
| `sql-executor.ts` | 新 | 编译 + 绑定 + 渲染 + 执行单个 sql-query 步骤 |
| `js-transform-executor.ts` | 新 | 执行单个 js-transform 步骤脚本 |
| `variable-binder.ts` | 新 | 从 `VariableContext` 提取 `{input, global, local}` 原始值喂给 `renderFromPlan` |
| `transaction-manager.ts` | 新 | 为写步骤组开/提交/回滚 knex 事务 |
| `result-assembler.ts` | 新 | 定位 assemble 步骤、返回其输出（经 responseSchema 校验） |
| `plan-cache.ts` | 新 | `CompiledSqlPlan` 的内存 LRU |
| `global-variable-loader.ts` | 新 | 按 `projectId` 加载全局变量值 |
| `input-validator.ts` | 新 | 按 `requestParams` 校验输入 |

`server/domains/api-test/api-test.service.ts` 降为**薄消费者**：加载全局变量 → 调 `runWorkflow` → 包装 `ApiTestResult`（日志 / 计时 / size / requestPreview）。

---

## 2. 引擎与消费者契约（A/B 一致性的落点）

引擎对外只暴露一个稳定契约。试运行面板（现在）和发布态 handler（Part B）都是薄消费者，只在三处不同：

1. 如何拿到 `ApiDefinitionDraft`（试运行：请求体内联；发布态：按 path+method 从存储解析）；
2. 如何拿到 `inputValues`（试运行：`params` 扁平 record；发布态：按 `requestParams.location` 从 query/body/header 抽取）；
3. 如何包装结果（试运行：包成 `ApiTestResult`；发布态：作为 HTTP body 返回）。

引擎**不碰 Hono 的 req/res**——那是消费者的事。

### 2.1 引擎公共契约

```ts
// server/workflow/workflow-runner.ts
runWorkflow(
  apiDefinition: ApiDefinitionDraft,
  inputValues: Record<string, unknown>,   // 消费者已抽取
  globalValues: Record<string, unknown>,  // 消费者已加载
  deps: WorkflowDeps,
  options?: { onLog?: (log: ExecutionLog) => void },
): Promise<WorkflowRunResult>

type WorkflowDeps = {
  knexRegistry: KnexRegistry
  getDataSource: (id: string) => DataSource | undefined
  analyzer: EnhancedSqlAnalyzer
}

type WorkflowRunResult = {
  status: 'success' | 'failed'
  context: VariableContext
  stepResults: StepResult[]          // { stepId, kind, status: 'success'|'skipped'|'failed', durationMs, error? }
  response: unknown                  // success 时为 assemble 输出
  logs: ExecutionLog[]               // 每步，含失败前的已执行步骤
  error?: { code: WorkflowErrorCode, message: string, stepId?: string, details?: unknown }
}

type WorkflowErrorCode =
  | 'INVALID_INPUT'            // → 消费者映射 400
  | 'WRITE_ACROSS_DATASOURCES'  // → 500（配置错误）
  | 'ASSEMBLE_MISSING'          // → 500（配置错误）
  | 'STEP_FAILED'               // → 500，stepId 已设
}
```

### 2.2 消费者共用工具（也在 `server/workflow/`）

- `validateInput(apiDefinition, inputValues)`：按 `requestParams`（name/location/type/required）校验，返回 `{ ok, values?, errors? }`。`runWorkflow` 内部第一步先跑它，Part B 免费拿到输入校验；同时导出供 pre-flight 使用。
- `loadGlobalValues(projectId, { globalVariableService, projectVariableService })`：合并平台全局与项目变量，同名时项目变量覆盖平台全局，返回扁平 `名→值` record。引擎不直接依赖 repository。

---

## 3. WorkflowRunner + TransactionManager

### 3.1 执行循环

`WorkflowRunner`（扩展现有骨架）执行循环。先定义预算符号 `WorkflowSymbols`（runner 开工时从 `apiDefinition` 预算一次）：

```ts
type WorkflowSymbols = {
  inputNames: string[]        // requestParams.name
  globalNames: string[]        // 全局变量名
  localNames: string[]         // localVariables.name ∪ 所有步骤 outputVariable
  defaults: Record<string, unknown>  // 名→默认值（local 变量 defaultValue、全局默认；input 无默认）
}
```

1. `context = buildApiVariableContext({ input: inputValues, global: globalValues, localVariables: apiDefinition.localVariables })`。
2. 跑 `validateInput`；不过 → 直接返回 `{ status: 'failed', error: { code: 'INVALID_INPUT', details: 字段级错误 }, logs: [] }`，不进工作流。
3. **预算 `WorkflowSymbols`**（上述定义），传给 SqlExecutor 用于 `analyze`，修掉现有只传 inputNames 的缺口，让 `$var!` 默认值、local/global 解析在渲染时生效。
4. **预扫描写步骤**：对每个 sql-query 步骤，经 `plan-cache` 拿 `CompiledSqlPlan`，用 `analyzer.getStatementType(plan)`（新增小工具，读 AST 顶层类型）判定 `select|insert|update|delete|other`。若存在写步骤：
   - 校验所有写步骤共用同一 `datasourceId`，否则返回 `{ status: 'failed', code: 'WRITE_ACROSS_DATASOURCES' }`；
   - 经 `TransactionManager` 为该 datasource 开一个 knex 事务 `trx`，仅传给写步骤的 `SqlExecutor`。读步骤一律 autocommit（即便同库也不进 trx，v1 不处理「读见未提交写」）。
5. 顺序遍历步骤：
   - 求值 `step.condition`（`evalExpressionFromContext`，已存在）；为假 → 把默认值写入 `outputVariable`、记 skipped 日志、跳过；
   - 按 `kind` 分发：`sql-query` → `SqlExecutor.execute(step, context, { knexRegistry, getDataSource, analyzer, symbols, trx? })`；`js-transform` → `JsTransformExecutor.execute(step, context)`；
   - 结果写回 `context.local[outputVariable] = { value, type: inferResultType(value) }`，记 success 日志（含 durationMs）；
   - 任一步抛错 → 记 failed 日志、回滚 trx（若有）、**中止循环**，错误带步骤上下文。
6. 循环结束：有 trx 且无失败 → commit。
7. `response = ResultAssembler.assemble(apiDefinition, context)`。
8. 返回 `{ status, context, stepResults, response, logs }`。

### 3.2 TransactionManager

`transaction-manager.ts`，小而薄：`openTransaction(knex)` / `commit(trx)` / `rollback(trx)`，封装 `knex.transaction()`，单一错误映射点，为将来（超时、分布式 tx）留缝。v1 直接用 knex 原生事务。

### 3.3 校验与边界

- 防御性校验 assemble：有且仅有一个 `role="assemble"`、且为最后一步（前端已保证，后端再校验）；缺失 → `{ status: 'failed', code: 'ASSEMBLE_MISSING' }`。
- 无写步骤 → 不开 trx，读可跨数据源。
- 写步骤被 condition 跳过 → 不执行、不影响 trx。
- 写流程中途失败 → rollback + 中止 + `STEP_FAILED`。

---

## 4. SqlExecutor + 变量绑定 + 全局变量加载 + Plan 缓存

### 4.1 SqlExecutor（`sql-executor.ts`，单个 sql-query 步骤）

1. `dataSource = getDataSource(step.datasourceId)`，缺失即报错；`knex = knexRegistry.getOrCreate(toKnexConfig(dataSource))`。
2. `plan = planCache.getOrCompile(step, symbols, { analyzer, dataSource })`。
3. `bound = variableBinder.bind(context)` → `{ input, global, local }` 原始值。
4. `rendered = renderFromPlan(plan, bound)` → `{ sql, params }`（属性路径 `$orders[].id` 由 renderFromPlan 内部解析）。
5. 执行：写步骤用 `trx.raw(rendered.sql, paramValues)`；读步骤用 `knex.raw(rendered.sql, paramValues)`；`paramValues = rendered.params.map(p => p.value)`；带 `.timeout(defaultMs, { cancel: true })`。
6. **结果归一化** `normalizeResult(raw, client)` → `unknown[]`：knex.raw 因方言返回不同形状（pg `{rows}`、mysql `[rows, fields]`、mssql recordset），统一抽平成行数组。现有 api-test.service 直接返 `rows` 对 mysql/mssql 是错的。
7. **multipleRows**：`step.multipleRows === false` → `rows[0] ?? null`；否则返回整个 `rows` 数组（默认多行）。
8. 返回（数组或单行）→ runner 写入 `context.local[outputVariable]`。

### 4.2 VariableBinder（`variable-binder.ts`，极薄）

`bind(context)` = 按作用域提取原始值，复用现有 `expression-evaluator.ts` 的 `extractRawValues`（上移到 variable-binder 共享，expression-evaluator 改为 import）。属性路径展开交给 renderFromPlan，binder 只给原始值。

### 4.3 GlobalVariableLoader（`global-variable-loader.ts`）

```ts
loadGlobalValues(projectId, { globalVariableService, projectVariableService }): Record<string, unknown>
```

合并平台全局（`global-variable`）与项目变量（`project-variable`），同名时**项目变量覆盖平台全局**，返回扁平 `名→值` record。引擎不直接依赖这两个 repository，loader 作为注入工具给消费者调用。全局以**已解析的原始值**形式加载（不在引擎内求值表达式）。

### 4.4 PlanCache（`plan-cache.ts`，v1 仅内存 L1）

- `getOrCompile(step, symbols, { analyzer, dataSource })`：key = `${step.id}:${sha256(step.sql)}`；命中后比对 `plan.schemaHash` 与当前 schemaHash，不一致则重编译（对应 design.md §1062-1072 的失效检测）。
- LRU 上限（如 1000），淘汰最旧。
- **预扫描写检测和执行共用此缓存**——同一 step 的 plan 只编译一次。
- L2（Redis）/ L3（DB 持久化 `step.compiledPlan`）推迟，标为 future。

---

## 5. JsTransformExecutor + ResultAssembler

### 5.1 JsTransformExecutor（`js-transform-executor.ts`）

I/O 契约**镜像 SQL 变量作用域约定**：

- `input`、`global` 作为**对象**注入 → 脚本里写 `input.customerName`、`global.getMin(...)`（design.md §649 的 `$.getMin` 即 `global.getMin`）。
- `local`（设计变量 + 上游步骤输出）作为**具名参数**注入 → 脚本里直接写裸名 `orderMain`、`orderItems`。

这样默认 assemble 脚本（裸名读 `orderMain`/`orderItems`/`productMap` + `return { list }`）原样可跑。

```ts
async function executeJsTransform(step, context): Promise<unknown> {
  const input = extractRawValues(context, 'input')
  const global = extractRawValues(context, 'global')
  const local = extractRawValues(context, 'local')
  const localNames = Object.keys(local)
  guardValidIdentifiers(localNames)          // 合法标识符、非保留字、非 input/global
  const fn = new Function('input', 'global', ...localNames, step.script)
  return await fn(input, global, ...localNames.map(n => local[n]))  // await 兼容 async IIFE
}
```

**与 `$` 简写的关系**：js-transform 步骤脚本**不用** `$` 前缀，用裸名 + `input.`/`global.` 对象；`$input.x`/`$.x`/`$x` 简写**只**保留给 `condition` 和 local 变量**表达式**（现有 expression-evaluator）。两边职责清晰、避免在脚本体内做 `$` 改写与模板字符串冲突。

- 同步、无网络；`new Function` 无 CPU 超时上限（受信实施人员前提下的已知限制，升级路径 isolated-vm）。
- 错误：`fn()` 抛错 → 包成 `JsTransformError(stepId, 脚本片段, 原消息)`，runner 捕获 → failed 日志 + 中止。
- 平台全局函数（`getMin` 等）经 `global` 对象注入，来源由 GlobalVariableLoader 组装。

### 5.2 ResultAssembler（`result-assembler.ts`）

```ts
assemble(apiDefinition, context): { response: unknown; diagnostics?: ResponseDiagnostic[] }
```

- 定位 `role === 'assemble'` 步骤。assemble 的存在/唯一/最后一步由 **runner 在循环前校验**（缺失 → `ASSEMBLE_MISSING`）；此处只做读取。
- 读取 `context.local[assembleStep.outputVariable].value`——assemble 步骤在循环中已执行过，assembler 只读取、不重跑。
- **按 responseSchema 轻量校验**：遍历 `SchemaField[]` 树，查顶层字段存在性 + required + 基本类型；**v1 策略：校验 → 产出 diagnostics → 透传响应**（assemble 作者掌控形状，过度严格会误杀合法响应）。严格报错模式留作 future 开关。试运行面板展示 diagnostics。
- assemble 被 condition 跳过时返回其默认值（罕见，assemble 通常无 condition）。

---

## 6. 错误处理与日志

### 6.1 错误处理（engine 不抛、返回 status）

`runWorkflow` 对预期失败**不抛异常**，返回结构化结果。策略：**首步失败即中止**；有 trx 则 rollback；`error.code` 携带上下文——SQL 步骤 `details = { sql, params, datasourceId, dialect }`（试运行面板可展示渲染后 SQL，便于调试），JS 步骤 `details = { scriptSnippet }`。

消费者按 `error.code` 映射 HTTP：`INVALID_INPUT → 400`，其余 → 500。

### 6.2 日志

- 每步 `ExecutionLog = { time, step, status, durationMs }`（沿用现有 schema，`step` 为展示串如 `"步骤 N - title"`）。
- engine 内部累积 logs 一并返回；`options.onLog` 可选钩子，供 Part B 的 log-query 域实时落库。

---

## 7. 测试策略

### 7.1 单测

- **SqlExecutor**：mock `knex.raw`/`trx.raw` 返回罐头行，断言 sql+params、`multipleRows` true/false 形状、`normalizeResult` 各 client 方言、写/读 trx 透传、超时、错误包装。
- **JsTransformExecutor**：真 `new Function`；断言裸名注入（上游输出可达）、`input.`/`global.` 访问、`guardValidIdentifiers` 拒非法名、async IIFE 被 await、错误包装。
- **VariableBinder**：按作用域原始值提取。
- **GlobalVariableLoader**：stub service，断言合并 + 项目覆盖平台。
- **PlanCache**：命中/未命中、schemaHash 失效触发重编译、LRU 淘汰。
- **ResultAssembler**：定位 assemble、读输出、轻量 schema 校验（required/type）、不符透传 + diagnostics。
- **TransactionManager**：stub `knex.transaction`，成功 commit / 失败 rollback。
- **validateInput**：缺必填 → 错误、类型不符 → 错误。
- **`analyzer.getStatementType`**：select/insert/update/delete 判定。

### 7.2 集成（runner）

扩展现有 `workflow-runner.test.ts`，利用骨架已有的 `options.executeStep` 注入假执行器 + 假 knex，断言：condition 跳过写默认值、执行顺序、下游可见上游、assemble 输出返回、写组同源单 trx commit、写组跨源 `WRITE_ACROSS_DATASOURCES`、步骤失败中止 + rollback + `STEP_FAILED`、输入非法 `INVALID_INPUT`。

---

## 8. 延后项与 Part B 契约承诺

### 8.1 明确延后（v1 不做）

- 发布态 Hono 路由 + OpenAPI 端点 → **Part B（下一 spec）**。
- DAG 编排 / 并行 / 分支（超出每步 condition）。
- Plan 缓存 L2（Redis）/ L3（DB 持久化 `step.compiledPlan`）。
- JS 硬沙箱 isolated-vm（CPU/内存/超时）。
- 响应严格校验模式（schema 不符即报错）；v1 校验 + 透传。
- 写事务内的读（同库读见未提交写）；跨数据源写 / 分布式事务。
- analyzer 既有 TODO：从 JSON Schema 推断 `dataType`（现硬编码 `'string'`）、`aliasMap` 真实解析、`references` 提取——主要影响编辑器提示，v1 执行可基于当前 analyzer。

### 8.2 Part B 契约承诺（保证 A/B 一致）

Part B 的 live handler = 解析定义（by path+method） → 按 `requestParams.location` 抽 `inputValues` → `loadGlobalValues` → `runWorkflow` → 按 `error.code` 映射 HTTP（`INVALID_INPUT→400`，其余→500） → 返 `response` 为 body。

- `runWorkflow(apiDefinition, inputValues, globalValues, deps, options?)` → `WorkflowRunResult{status, response, logs, error.code}`。
- `loadGlobalValues(projectId, services)` 共用。
- `validateInput` 内置于 `runWorkflow`（并导出供 pre-flight）。
- `deps`（knexRegistry/getDataSource/analyzer）注入，Part B 复用同一实例。
- `onLog` 钩子对接 log-query 域。

Part B 范围内已可见一个关键分叉（**动态注册真路由** vs **catch-all `/api/*` 查表分发**）与 OpenAPI 生成方式（手搓 vs `@hono/zod-openapi`），到 Part B spec 再定。
