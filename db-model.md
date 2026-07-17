# 数据库模型设计（db-model.md）

> Dynamic API Studio 平台自有元数据库（platform metadata store）的表结构设计。
> 本文档描述**平台自身**用于存储项目、API 配置、数据源、日志等的表，**不是**用户业务数据源的表。
> 权威技术设计见 [design.md](design.md)。

---

## 0. 通用约定

### 0.1 方言中立类型

平台自有库通过 Knex migration 落地，列类型采用方言中立写法，由 Knex 映射到具体方言：

| 文档类型 | PostgreSQL | MySQL | SQLite |
|---|---|---|---|
| `TEXT` | `text` | `text` / `varchar` | `TEXT` |
| `VARCHAR(n)` | `varchar(n)` | `varchar(n)` | `TEXT` |
| `INTEGER` | `integer` | `int` | `INTEGER` |
| `BIGINT` | `bigint` | `bigint` | `INTEGER` |
| `BOOLEAN` | `boolean` | `tinyint(1)` | `INTEGER` |
| `JSON` | `jsonb` | `json` | `TEXT` |
| `TIMESTAMP` | `timestamptz` | `datetime` | `TEXT` (ISO8601) |

### 0.2 主键与外键

- 主键统一为 `id`，类型 `VARCHAR(36)`（字符串 id，cuid/uuid 均可）。
- 外键列命名 `<entity>_id`，类型与目标主键一致。
- 外键是否建库级约束由 migration 决定；逻辑关系以本文档为准。

### 0.3 公共审计字段

除纯日志表（`api_invocation_log`、`schedule_task_log`、`db_schema`）外，所有主表都包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `created_at` | TIMESTAMP NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP NOT NULL | 最后更新时间 |
| `created_by` | VARCHAR(64) NULL | 创建人标识（字符串，暂不引入独立 user 表） |
| `updated_by` | VARCHAR(64) NULL | 最后更新人标识 |
| `deleted_at` | TIMESTAMP NULL | 软删除标记；NULL = 未删除，查询默认过滤 |

> 日志类表只追加、不修改、不软删除，故仅含自身时间字段。

---

## 1. 实体关系总览

```
project 1───────* api
                  api *───1 json_schema   (request_schema_id)
                  api *───1 json_schema   (response_schema_id)
                  api ·····> db_source     (workflow_steps[].datasourceId，内嵌引用)
                  api 1───* api_invocation_log

db_source 1───* db_schema                 (元数据缓存)
db_source 1───* schedule_task
              schedule_task 1───* schedule_task_log

project 0..1───* variable                 (scope=project 时关联 project；scope=global 时 project_id=NULL)
project 0..1───* custom_function                 (可项目内或全局)
```

### 表清单

| # | 表名 | 作用 | 软删除 |
|---|------|------|:---:|
| 1 | `project` | 项目分组 | ✓ |
| 2 | `api` | API 定义元信息（工作流步骤内嵌 JSON） | ✓ |
| 3 | `json_schema` | 可复用 JSON Schema 库 | ✓ |
| 4 | `db_source` | 业务数据源连接配置 | ✓ |
| 5 | `db_schema` | 数据源元数据缓存（表/列） | ✗（缓存） |
| 6 | `variable` | 变量（scope=global / project） | ✓ |
| 7 | `custom_function` | 可复用函数 | ✓ |
| 8 | `api_invocation_log` | API 调用日志（kind 区分 test/invoke） | ✗（日志） |
| 9 | `schedule_task` | 定时任务 | ✓ |
| 10 | `schedule_task_log` | 定时任务执行日志 | ✗（日志） |

---

## 2. project — 项目

项目是顶层分组，API、变量、函数都归属于项目。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `code` | VARCHAR(64) | NOT NULL, UNIQUE | 项目编码（唯一，用于引用） |
| `name` | VARCHAR(128) | NOT NULL | 项目名称 |
| `description` | TEXT | NULL | 描述 |
| `icon` | VARCHAR(64) | NULL | 图标标识 |
| `color` | VARCHAR(16) | NULL | 主题色 |
| `status` | VARCHAR(16) | NOT NULL, DEFAULT `'active'` | `active` \| `archived` |
| `api_count` | INTEGER | NOT NULL, DEFAULT 0 | 冗余统计：API 数量 |
| `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` | | | 公共审计字段 |

**索引**：`UNIQUE(code)`、`INDEX(status)`、`INDEX(deleted_at)`

---

## 3. api — API 定义

API 元信息。请求/响应结构通过 FK 引用可复用的 `json_schema` 行；工作流步骤作为 `workflow_steps` JSON 数组内嵌于本行。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `project_id` | VARCHAR(36) | NOT NULL, FK→project.id | 所属项目 |
| `name` | VARCHAR(128) | NOT NULL | API 名称 |
| `path` | VARCHAR(256) | NOT NULL | 路由路径，如 `/order/list` |
| `method` | VARCHAR(8) | NOT NULL | `GET`\|`POST`\|`PUT`\|`DELETE`\|`PATCH` |
| `status` | VARCHAR(16) | NOT NULL, DEFAULT `'draft'` | `draft` \| `published` |
| `version` | INTEGER | NOT NULL, DEFAULT 1 | 版本号，每次发布递增 |
| `body_content_type` | VARCHAR(32) | NULL | `json`\|`x-www-form-urlencoded`\|`form-data` |
| `request_schema_id` | VARCHAR(36) | NULL, FK→json_schema.id | 请求参数 schema（复用） |
| `response_schema_id` | VARCHAR(36) | NULL, FK→json_schema.id | 响应结构 schema（复用） |
| `workflow_steps` | JSON | NULL | 工作流步骤数组（含每步预编译 plan，见下） |
| `tags` | JSON | NULL | 标签数组 `string[]` |
| `permissions` | JSON | NULL | 权限标识数组 `string[]` |
| `description` | TEXT | NULL | 描述 |
| `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` | | | 公共审计字段 |

**索引**：`INDEX(project_id)`、`UNIQUE(project_id, method, path)`（同项目内方法+路径唯一）、`INDEX(status)`、`INDEX(deleted_at)`

> 备注：`request_schema_id` / `response_schema_id` 为多对一引用——一个 `json_schema` 可被多个 API 复用。变量命名空间（`$ctx`/`$` 等）属平台级，由 `variable` 表与上下文提供，不在 API 行的 FK 内。

### `workflow_steps` 结构（JSON）

有序步骤数组。SQL 步骤的预编译结果（`CompiledSqlPlan`）随步骤内嵌，作为 design.md §9.3 的 L3 持久层（冷启动回退 + 并发控制，靠 `planVersion`）。`datasourceId` 为对 `db_source` 的内嵌引用（非库级外键）。

```jsonc
[
  {
    "id": "step_order_main",
    "seq": 0,
    "kind": "sql-query",                 // sql-query | js-transform
    "title": "查询订单主表",
    "resultVariable": "orderMain",        // 结果变量名，供下游步骤引用
    "datasourceId": "mes_pg",            // sql-query 步骤绑定的数据源（→ db_source.id）
    "sql": "SELECT ... WHERE order_no = $input.orderNo?",  // 增强 SQL 原文
    "script": null,                       // js-transform 步骤的脚本
    "sourceHash": "string",              // SQL 原文 hash，缓存失效判定
    "schemaHash": "string",              // 关联 JSON Schema hash
    "planVersion": 0,                     // 编译版本号，乐观并发控制
    "status": "dirty",                    // valid | dirty | invalid
    "compiledPlan": { /* CompiledSqlPlan，见下 */ }
  }
]
```

#### `compiledPlan` 结构

对应 design.md §9.3 的 `CompiledSqlPlan`：

```jsonc
{
  "sourceHash": "string",
  "schemaHash": "string",
  "dialect": "postgresql",
  "processedSql": "string",          // 变量 → 占位符 后的 SQL
  "varMap": {},                       // 占位符 → 变量信息
  "ast": {},                          // 可序列化 AST
  "variableRefs": [],                 // 变量引用列表
  "aliasMap": {},                     // 表别名 → 表名
  "optionalConditions": [],           // $var? 可选条件项索引
  "staticDiagnostics": [],            // 静态校验诊断
  "references": []                    // 步骤间依赖引用
}
```

---

## 4. json_schema — 可复用 JSON Schema 库

每行存一份**完整 JSON Schema 文档**，按 `kind` 区分用途。被 `api` 通过 FK 复用。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `project_id` | VARCHAR(36) | NULL, FK→project.id | 归属项目；NULL 表示全局共享 json_schema |
| `name` | VARCHAR(128) | NOT NULL | schema 名称（如“订单查询请求”“分页结果”） |
| `kind` | VARCHAR(32) | NOT NULL | `request` \| `response` \| `variable-namespace` |
| `content` | JSON | NOT NULL | 完整 JSON Schema 文档（含 `x-sql` 扩展） |
| `description` | TEXT | NULL | 描述 |
| `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` | | | 公共审计字段 |

**索引**：`INDEX(project_id)`、`INDEX(kind)`、`INDEX(deleted_at)`

> `content` 内嵌的 JSON Schema 遵循 design.md §8：支持 `title`、`enum`、`default`、以及 `x-sql.{kind,map}` 字段名白名单映射。

---

## 5. db_source — 业务数据源

用户业务库的连接配置。SQL 步骤、定时任务执行时按 `id` 取得对应 Knex 实例。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `name` | VARCHAR(128) | NOT NULL | 数据源名称 |
| `dialect` | VARCHAR(16) | NOT NULL | `postgresql`\|`mysql`\|`oracle`\|`sqlserver`\|`tdengine` |
| `host` | VARCHAR(256) | NOT NULL | 主机 |
| `port` | INTEGER | NOT NULL | 端口 |
| `database` | VARCHAR(128) | NOT NULL | 数据库名 |
| `username` | VARCHAR(128) | NOT NULL | 用户名 |
| `password` | TEXT | NOT NULL | 密码（**加密存储**，不明文落库） |
| `description` | TEXT | NULL | 描述 |
| `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` | | | 公共审计字段 |

**索引**：`INDEX(dialect)`、`INDEX(deleted_at)`

> 安全：`password` 使用平台密钥对称加密后存储；返回前端时脱敏。Knex client 选择见 CLAUDE.md（`postgresql→pg`、`mysql→mysql2`、`sqlserver→mssql`、`oracle→oracledb`）。

---

## 6. db_schema — 数据源元数据缓存

对 `db_source` 探测 `information_schema` 后缓存的表/列/外键/索引结构，驱动编辑器补全。属缓存表，可重建，不软删除。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `db_source_id` | VARCHAR(36) | NOT NULL, FK→db_source.id | 所属数据源 |
| `schema_name` | VARCHAR(128) | NULL | 库内 schema 名（PG schema / 多库实例） |
| `object_type` | VARCHAR(16) | NOT NULL | `table` \| `view` |
| `object_name` | VARCHAR(128) | NOT NULL | 表/视图名 |
| `columns` | JSON | NOT NULL | 列定义数组（见下） |
| `foreign_keys` | JSON | NULL | 外键定义数组（见下）；视图/无外键时为 NULL |
| `indexes` | JSON | NULL | 索引定义数组（见下） |
| `comment` | TEXT | NULL | 表/视图注释 |
| `created_at` | TIMESTAMP | NOT NULL | 首次缓存时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 最后刷新时间（兼作探测时间） |

**索引**：`INDEX(db_source_id)`、`UNIQUE(db_source_id, schema_name, object_name)`

### `columns` 结构（JSON）

```jsonc
[
  {
    "name": "order_no",
    "dataType": "varchar",
    "length": 64,
    "nullable": false,
    "isPrimaryKey": true,
    "defaultValue": null,
    "autoIncrement": false,
    "ordinalPosition": 2,
    "comment": "订单号"
  }
]
```

> 除 `name`/`dataType`/`nullable`/`isPrimaryKey` 外字段可选：`length`（varchar/char 长度）、`precision`/`scale`（numeric 精度/标度）、`defaultValue`（列默认值原始表达式，如 `now()`、`'active'`、`1`，null 表示无默认）、`autoIncrement`（serial/identity）、`ordinalPosition`（列序号从 1）、`comment`。

### `foreign_keys` 结构（JSON）

```jsonc
[
  {
    "name": "fk_order_detail_order",
    "columns": ["order_id"],
    "refSchema": null,
    "refTable": "order_main",
    "refColumns": ["order_id"],
    "onDelete": "CASCADE",
    "onUpdate": null
  }
]
```

### `indexes` 结构（JSON）

```jsonc
[
  { "name": "pk_order_main", "columns": ["order_id"], "unique": true, "primary": true },
  { "name": "idx_order_no", "columns": ["order_no"], "unique": true, "primary": false }
]
```

---

## 7. variable — 变量

合并全局变量与项目变量为单表，用 `scope` 区分。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `scope` | VARCHAR(16) | NOT NULL | `global` \| `project` |
| `project_id` | VARCHAR(36) | NULL, FK→project.id | `scope=project` 时必填；`scope=global` 时为 NULL |
| `name` | VARCHAR(64) | NOT NULL | 变量名（代码引用，如 `$.tenantId`） |
| `label` | VARCHAR(128) | NOT NULL | 显示名 |
| `kind` | VARCHAR(16) | NOT NULL | `single` \| `list` |
| `value` | TEXT | NULL | 单值（`kind=single`） |
| `items` | JSON | NULL | 列表值 `string[]`（`kind=list`） |
| `description` | TEXT | NULL | 描述 |
| `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` | | | 公共审计字段 |

**索引**：`INDEX(scope)`、`INDEX(project_id)`、`UNIQUE(scope, project_id, name)`、`INDEX(deleted_at)`

> 约束：`scope=global` 时 `project_id` 为 NULL；`scope=project` 时 `project_id` 非空。唯一约束保证同作用域内变量名不重复（全局作用域下 `project_id=NULL` 参与唯一性，按方言 NULL 处理可在应用层兜底）。

---

## 8. custom_function — 可复用函数

供 JS 转换步骤或表达式复用的命名函数。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `project_id` | VARCHAR(36) | NULL, FK→project.id | 归属项目；NULL 表示全局函数 |
| `name` | VARCHAR(64) | NOT NULL | 函数名（调用标识） |
| `label` | VARCHAR(128) | NULL | 显示名 |
| `scope` | VARCHAR(16) | NOT NULL | `global` \| `project` |
| `language` | VARCHAR(16) | NOT NULL, DEFAULT `'javascript'` | 实现语言 |
| `inputSchema` | JSON | NULL | 形参定义数组 |
| `body` | TEXT | NOT NULL | 函数体/脚本 |
| `outputSchema` | JSON | NULL | 返回类型标注 |
| `description` | TEXT | NULL | 描述 |
| `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` | | | 公共审计字段 |

---

## 9. api_invocation_log — API 调用日志

记录每次 API 执行。`kind` 区分设计器测试与对外真实调用。逐步执行详情内嵌 `steps` JSON。日志表只追加。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `api_id` | VARCHAR(36) | NULL, FK→api.id | 关联 API（草稿测试可能无持久 API） |
| `project_id` | VARCHAR(36) | NULL, FK→project.id | 冗余便于按项目查询 |
| `kind` | VARCHAR(16) | NOT NULL | `test`（测试面板执行）\| `invoke`（真实调用） |
| `invoked_at` | TIMESTAMP | NOT NULL | 调用时间 |
| `method` | VARCHAR(8) | NOT NULL | HTTP 方法 |
| `path` | VARCHAR(256) | NOT NULL | 请求路径 |
| `api_name` | VARCHAR(128) | NULL | 冗余 API 名称（快照） |
| `status_code` | INTEGER | NULL | HTTP 状态码 |
| `status` | VARCHAR(16) | NOT NULL | `success` \| `failed` \| `timeout` |
| `duration_ms` | INTEGER | NOT NULL | 总耗时（毫秒） |
| `request_params` | JSON | NULL | 入参快照（$input/$ctx 等） |
| `response_body` | JSON | NULL | 响应体快照 |
| `error_detail` | TEXT | NULL | 错误详情/堆栈 |
| `steps` | JSON | NULL | 逐步执行详情数组（见下） |
| `created_at` | TIMESTAMP | NOT NULL | 落库时间 |

**索引**：`INDEX(api_id)`、`INDEX(project_id)`、`INDEX(kind)`、`INDEX(invoked_at)`、`INDEX(status)`

### `steps` 结构（JSON）

```jsonc
[
  {
    "stepId": "string",
    "seq": 0,
    "kind": "sql-query",
    "title": "查询订单主表",
    "datasourceId": "mes_pg",
    "sql": "SELECT ... WHERE order_no = ?",   // 渲染后 SQL（参数化）
    "params": ["A001"],                         // 绑定参数
    "rowCount": 12,                             // SQL 步骤影响/返回行数
    "durationMs": 35,
    "status": "success",                        // success | failed
    "error": null
  }
]
```

---

## 10. schedule_task — 定时任务

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `name` | VARCHAR(128) | NOT NULL | 任务名称 |
| `description` | TEXT | NULL | 描述 |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT true | 是否启用 |
| `datasource_id` | VARCHAR(36) | NOT NULL, FK→db_source.id | 执行数据源 |
| `sql` | TEXT | NOT NULL | 执行 SQL |
| `trigger` | JSON | NOT NULL | 触发配置（见下） |
| `last_run_at` | TIMESTAMP | NULL | 上次执行时间 |
| `next_run_at` | TIMESTAMP | NULL | 下次计划时间 |
| `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` | | | 公共审计字段 |

**索引**：`INDEX(datasource_id)`、`INDEX(enabled)`、`INDEX(next_run_at)`、`INDEX(deleted_at)`

### `trigger` 结构（JSON）

```jsonc
// cron 模式
{ "mode": "cron", "expression": "0 0 * * *" }

// interval 模式
{ "mode": "interval", "every": 5, "unit": "minute" }   // unit: minute | hour | day
```

---

## 11. schedule_task_log — 定时任务执行日志

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(36) | PK | 主键 |
| `task_id` | VARCHAR(36) | NOT NULL, FK→schedule_task.id | 所属任务 |
| `started_at` | TIMESTAMP | NOT NULL | 开始时间 |
| `trigger` | VARCHAR(16) | NOT NULL | `auto`（调度触发）\| `manual`（手动触发） |
| `status` | VARCHAR(16) | NOT NULL | `success` \| `failed` \| `running` |
| `duration_ms` | INTEGER | NULL | 耗时（毫秒），running 时为空 |
| `affected_rows` | INTEGER | NULL | 影响行数 |
| `error` | TEXT | NULL | 错误信息 |
| `created_at` | TIMESTAMP | NOT NULL | 落库时间 |

**索引**：`INDEX(task_id)`、`INDEX(started_at)`、`INDEX(status)`

---

## 12. 设计说明

1. **可复用 json_schema 模型**：`json_schema` 为独立实体，`api` 通过 `request_schema_id` / `response_schema_id` 引用，实现跨 API 复用。代码现状是内嵌 JSON，迁移到本模型需在 service 层拆分。
2. **工作流步骤内嵌于 api**：`workflow_steps` 作为 JSON 数组随 `api` 行存储；每步的 `compiledPlan` 即 design.md §9.3 三级缓存的 L3 持久层（L1 内存 / L2 Redis / L3 api 行内）。
3. **日志与缓存表不软删除**：`api_invocation_log`、`schedule_task_log` 仅追加；`db_schema` 为可重建缓存，靠 `UNIQUE(db_source_id, schema_name, table_name)` upsert 刷新。
4. **变量单表 + scope**：`variable.scope` 取代原 `global_variable` / `project_variable` 双表。
5. **多租户**：design.md 中 `$ctx.tenantId` 是**请求上下文变量**，不是平台表列；本模型未引入租户列，如需平台级多租户可后续在主表加 `tenant_id`。
6. **密码安全**：`db_source.password` 加密存储，接口返回脱敏。

---

## 13. 待办 / 开放项

- `created_by` / `updated_by` 当前为字符串标识；若后续引入用户体系，可加 `user` 表并改为 FK。
- `workflow_steps[].compiledPlan.ast` 的可序列化结构（`SerializedAst`）待 analyzer 模块定型后细化。
- `function.params` 的具体 schema 待函数管理模块详细设计后补充。
