import type { Generated } from 'kysely'

/**
 * Kysely 数据库类型 —— 平台元数据库（PostgreSQL）所有表的列定义。
 *
 * 权威表结构见 db-model.md；本文件是运行期查询的类型来源（row type），
 * 与 {@code @shared/contracts/*} 契约在 repository 层做映射，二者不互为来源。
 *
 * 约定：
 *  - `id` 由应用层生成（varchar(36)），insert 时必填，非 DB 生成。
 *  - `created_at` / `updated_at` 由 DB `default now()` 生成 → `Generated<string>`，insert 可省略。
 *  - `status` / `version` / `api_count` 等带默认值的列用 `Generated`，insert 可省略。
 *  - 枚举列使用字面量联合类型（如 `'active' | 'archived'`），增强类型安全。
 *  - JSONB 列以最贴近的 TS 结构标注；嵌套结构在 repository 迁移阶段再细化到契约，
 *    此处对深度嵌套结构保持宽松（`Record<string, unknown>` / `unknown[]`）。
 *  - 软删除列 `deleted_at` 可空。
 */

/** project.status */
type ProjectStatus = 'active' | 'archived'

/** api.status */
type ApiStatus = 'draft' | 'published'

/** api.method */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/** api.body_content_type */
type BodyContentType = 'json' | 'x-www-form-urlencoded' | 'form-data'

/** json_schema.kind */
type JsonSchemaKind = 'request' | 'response' | 'variable-namespace'

/** db_source.dialect */
type DataSourceDialect = 'postgresql' | 'mysql' | 'oracle' | 'sqlserver' | 'tdengine'

/** db_schema.object_type */
type DbObjectType = 'table' | 'view'

/** variable.scope */
type VariableScope = 'global' | 'project'

/** variable.kind */
type VariableKind = 'single' | 'list'

/** api_invocation_log.kind */
type InvocationKind = 'test' | 'invoke'

/** api_invocation_log.status / schedule_task_log.status */
type ExecutionStatus = 'success' | 'failed' | 'timeout' | 'running'

/** schedule_task_log.trigger */
type ScheduleTrigger = 'auto' | 'manual'

/** 公共审计字段（project / api / json_schema / db_source / variable / custom_function / schedule_task）。 */
export interface AuditColumns {
  created_at: Generated<Date>
  updated_at: Generated<Date>
  created_by: string | null
  updated_by: string | null
  deleted_at: Date | null
}

/** 1. project — 项目分组。 */
export interface ProjectTable extends AuditColumns {
  id: string
  code: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  status: Generated<ProjectStatus>
  api_count: Generated<number>
  /** 项目关联的业务数据源（可空），一个 db_source 可被多个 project 引用。 */
  db_source_id: string | null
}

/** 2. api — API 定义元信息（工作流步骤内嵌 JSON）。 */
export interface ApiTable extends AuditColumns {
  id: string
  project_id: string
  name: string
  path: string
  method: HttpMethod
  status: Generated<ApiStatus>
  version: Generated<number>
  body_content_type: BodyContentType | null
  request_schema_id: string | null
  response_schema_id: string | null
  /**
   * 以下内联列为当前「内联 JSON」模型所需（db-model §12.1 注明内联是现状、可复用 json_schema 是未来），
   * 由 0002 迁移补充。request_schema_id/response_schema_id 暂留空（未来可复用模型启用时再用）。
   */
  require_auth: Generated<boolean>
  request_params: unknown[] | null
  response_schema: unknown[] | null
  local_variables: unknown[] | null
  /** 工作流步骤数组（含每步预编译 plan），结构见 db-model.md §3。 */
  workflow_steps: unknown[] | null
  tags: string[] | null
  permissions: string[] | null
  description: string | null
}

/** 3. json_schema — 可复用 JSON Schema 库。 */
export interface JsonSchemaTable extends AuditColumns {
  id: string
  project_id: string | null
  name: string
  kind: JsonSchemaKind
  /** 完整 JSON Schema 文档（含 x-sql 扩展）。 */
  content: Record<string, unknown>
  description: string | null
}

/** 4. db_source — 业务数据源连接配置。 */
export interface DbSourceTable extends AuditColumns {
  id: string
  name: string
  dialect: DataSourceDialect
  host: string
  port: number
  database: string
  username: string
  /** 加密存储，不明文落库；返回前端时脱敏。 */
  password: string
  description: string | null
}

/** 5. db_source_metadata — 真实数据源元数据缓存（表/列），供 SQL 编辑器补全。 */
export interface DbSourceMetadataTable {
  id: string
  db_source_id: string
  schema_name: string | null
  object_type: DbObjectType
  object_name: string
  /** 列定义数组，结构见 db-model.md §6。 */
  columns: unknown[]
  /** 外键定义数组，结构见 db-model.md §6。 */
  foreign_keys: unknown[] | null
  /** 索引定义数组，结构见 db-model.md §6。 */
  indexes: unknown[] | null
  comment: string | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

/** 5.5 db_schema — 项目级数据模型（table/view），用于生成 JSON Schema 与 CRUD API。 */
export interface DbSchemaTable {
  id: string
  project_id: string
  /** 来源数据源（数据库优先时填充；设计优先时可为空）。 */
  db_source_id: string | null
  schema_name: string | null
  object_type: DbObjectType
  object_name: string
  /** 列定义数组，结构见 db-model.md §6。 */
  columns: unknown[]
  /** 外键定义数组，结构见 db-model.md §6。 */
  foreign_keys: unknown[] | null
  /** 索引定义数组，结构见 db-model.md §6。 */
  indexes: unknown[] | null
  comment: string | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

/** 6. variable — 变量（scope=global / project 合并单表）。 */
export interface VariableTable extends AuditColumns {
  id: string
  scope: VariableScope
  project_id: string | null
  name: string
  label: string
  kind: VariableKind
  value: string | null
  /**
   * jsonb 数组列。pg 对 JS 数组按 PG 数组格式序列化（非 JSON），直接写数组会报错；
   * 须用 `jsonbArray()` 辅助（见 repository-helpers.ts）写 JSON 字符串，读时 pg 自动 parse 回数组。
   * 其它 jsonb 数组列（tags/permissions/columns/workflow_steps/steps/params）同理。
   */
  items: string[] | null
  description: string | null
}

/** 7. custom_function — 可复用函数。 */
export interface CustomFunctionTable extends AuditColumns {
  id: string
  project_id: string | null
  scope: 'global' | 'project'
  name: string
  label: string | null
  language: Generated<string>
  inputSchema: unknown[] | null
  body: string
  outputSchema: unknown[] | null
  description: string | null
}

/** 8. api_invocation_log — API 调用日志（只追加）。 */
export interface ApiInvocationLogTable {
  id: string
  api_id: string | null
  project_id: string | null
  kind: InvocationKind
  invoked_at: Date
  method: HttpMethod
  path: string
  api_name: string | null
  status_code: number | null
  status: ExecutionStatus
  duration_ms: number
  request_params: unknown | null
  response_body: unknown | null
  error_detail: string | null
  /** 逐步执行详情数组，结构见 db-model.md §9。 */
  steps: unknown[] | null
  created_at: Generated<Date>
}

/** 9. schedule_task — 定时任务。 */
export interface ScheduleTaskTable extends AuditColumns {
  id: string
  name: string
  description: string | null
  enabled: Generated<boolean>
  datasource_id: string
  sql: string
  /** 触发配置，结构见 db-model.md §10。 */
  trigger: Record<string, unknown>
  last_run_at: Date | null
  next_run_at: Date | null
}

/** 10. schedule_task_log — 定时任务执行日志（只追加）。 */
export interface ScheduleTaskLogTable {
  id: string
  task_id: string
  started_at: Date
  trigger: ScheduleTrigger
  status: ExecutionStatus
  duration_ms: number | null
  affected_rows: number | null
  error: string | null
  created_at: Generated<Date>
}

/**
 * 平台元数据库的 Kysely 类型入口。泛型参数传入 `Kysely<Database>` 即可获得类型安全的查询。
 */
export interface Database {
  project: ProjectTable
  api: ApiTable
  json_schema: JsonSchemaTable
  db_source: DbSourceTable
  db_source_metadata: DbSourceMetadataTable
  db_schema: DbSchemaTable
  variable: VariableTable
  custom_function: CustomFunctionTable
  api_invocation_log: ApiInvocationLogTable
  schedule_task: ScheduleTaskTable
  schedule_task_log: ScheduleTaskLogTable
}