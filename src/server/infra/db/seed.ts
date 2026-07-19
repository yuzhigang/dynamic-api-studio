import type { Kysely } from 'kysely'

import { createEmptyApiDefinition } from '@/shared/api-definition/create-empty-api-definition'
import { mockInvocationLogs } from '@/modules/invocation-log/mock-invocation-logs'
import { jsonbArray } from '@/server/infra/db/repository-helpers'
import type { Database } from '@/server/infra/db/tables'
import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

/**
 * 平台元数据库的 demo 种子数据。**幂等**：重复执行以 upsert 覆盖，可把状态重置回 demo 初值。
 *
 * 已覆盖 project + db_source + variable + api（其 repository 已迁 Kysely）；其余实体待对应 repository 迁移后扩展。
 * `id` 与各 in-memory repository 的 seed 保持一致，确保 DB + 内存混合阶段引用关系不中断。
 */
const SEED_TIMESTAMP = new Date('2026-06-27T00:00:00.000Z')

const SEED_PROJECTS: Array<{
  id: string
  code: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  status: 'active' | 'archived'
  api_count: number
  db_source_id: string | null
  created_at: Date
  updated_at: Date
}> = [
  {
    id: 'project_order',
    code: 'ORDER',
    name: '订单中心',
    description: '订单查询、明细和商品组装 API',
    icon: 'ShoppingCart',
    color: 'blue',
    status: 'active',
    api_count: 6,
    db_source_id: 'ds_order_oracle',
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: 'project_crm',
    code: 'CRM',
    name: '客户中心',
    description: '客户档案与画像相关 API',
    icon: 'Users',
    color: 'emerald',
    status: 'active',
    api_count: 0,
    db_source_id: 'ds_crm_postgres',
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
]

const SEED_DATASOURCES: Array<{
  id: string
  name: string
  dialect: 'postgresql' | 'mysql' | 'oracle' | 'sqlserver' | 'tdengine'
  host: string
  port: number
  database: string
  username: string
  password: string
  description: string | null
  created_at: Date
  updated_at: Date
}> = [
  {
    id: 'ds_order_oracle',
    name: '订单库（Oracle）',
    dialect: 'oracle',
    host: '10.10.0.21',
    port: 1521,
    database: 'ORCLPDB1',
    username: 'mes',
    password: '******',
    description: '订单中心主库，订单、明细、商品数据',
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: 'ds_crm_postgres',
    name: '客户库（PostgreSQL）',
    dialect: 'postgresql',
    host: '10.10.0.32',
    port: 5432,
    database: 'crm',
    username: 'crm_app',
    password: '******',
    description: '客户档案与画像数据',
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
]

type VariableSeed = {
  id: string
  scope: 'global' | 'project'
  project_id: string | null
  name: string
  label: string
  kind: 'single' | 'list'
  value: string
  items: string[]
  description: string | null
  created_at: Date
  updated_at: Date
}

const SEED_VARIABLES: VariableSeed[] = [
  {
    id: 'gv_default_page_size',
    scope: 'global',
    project_id: null,
    name: 'default_page_size',
    label: '默认分页大小',
    kind: 'single',
    value: '20',
    items: [],
    description: null,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: 'gv_valid_order_status',
    scope: 'global',
    project_id: null,
    name: 'valid_order_status',
    label: '有效订单状态',
    kind: 'list',
    value: '',
    items: ['active', 'frozen', 'closed'],
    description: null,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: 'pv_order_region',
    scope: 'project',
    project_id: 'project_order',
    name: 'region',
    label: '区域',
    kind: 'single',
    value: 'CN',
    items: [],
    description: null,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: 'pv_order_channels',
    scope: 'project',
    project_id: 'project_order',
    name: 'channels',
    label: '渠道',
    kind: 'list',
    value: '',
    items: ['web', 'app', 'pos'],
    description: null,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
]

const SEED_APIS: ApiDefinitionDraft[] = [
  createEmptyApiDefinition({
    id: 'api_order_query',
    projectId: 'project_order',
    status: 'published',
    requireAuth: false,
  }),
  createEmptyApiDefinition({
    id: 'api_order_detail',
    projectId: 'project_order',
    status: 'published',
    requireAuth: false,
    name: '订单详情接口',
    path: '/api/v1/order/detail',
    method: 'GET',
    tags: ['订单', '详情'],
    permissions: ['order.read'],
    description: '按订单编号或订单 ID 查询订单详情。',
  }),
  createEmptyApiDefinition({
    id: 'api_customer_query',
    projectId: 'project_order',
    name: '客户查询接口',
    path: '/api/v1/customer/query',
    method: 'POST',
    tags: ['客户', '查询'],
    permissions: ['customer.read'],
    description: '按客户名称、手机号和会员等级查询客户信息。',
  }),
  createEmptyApiDefinition({
    id: 'api_product_query',
    projectId: 'project_order',
    status: 'published',
    requireAuth: false,
    name: '商品查询接口',
    path: '/api/v1/product/query',
    method: 'POST',
    tags: ['商品', '查询'],
    permissions: ['product.read'],
    description: '查询商品基础信息、SKU 和上下架状态。',
  }),
  createEmptyApiDefinition({
    id: 'api_stock_query',
    projectId: 'project_order',
    name: '库存查询接口',
    path: '/api/v1/stock/query',
    method: 'POST',
    tags: ['库存', '查询'],
    permissions: ['stock.read'],
    description: '查询仓库库存余量和锁定库存。',
  }),
  createEmptyApiDefinition({
    id: 'api_report_internal',
    projectId: 'project_order',
    status: 'published',
    requireAuth: false,
    name: '内部报表接口',
    path: '/api/v1/report/internal',
    method: 'GET',
    tags: ['报表', '内部接口'],
    permissions: ['report.read'],
    description: '内部运营报表查询接口。',
  }),
]

type TaskSeed = {
  id: string
  name: string
  description: string | null
  enabled: boolean
  datasource_id: string
  sql: string
  trigger: Record<string, unknown>
  last_run_at: Date | null
  next_run_at: Date | null
  created_at: Date
  updated_at: Date
}

// dataSourceId 改用已 seed 的真实 db_source：ds_pg/ds_mysql/ds_report 仅存在于 task 的 mock 路由（mock-data-sources），
// 不在 db_source 表，直接用会触发 schedule_task.datasource_id 外键违规。
const SEED_TASKS: TaskSeed[] = [
  {
    id: 'task_cleanup',
    name: '每日临时表清理',
    description: '凌晨清理临时表数据',
    enabled: true,
    datasource_id: 'ds_order_oracle',
    sql: "DELETE FROM tmp_order_snapshot WHERE created_at < NOW() - INTERVAL '1 day'",
    trigger: { mode: 'cron', expression: '0 2 * * *' },
    last_run_at: new Date('2026-06-28T02:00:00.000Z'),
    next_run_at: new Date('2026-06-29T02:00:00.000Z'),
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: 'task_sync',
    name: '订单指标同步',
    description: '每 5 分钟刷新订单聚合指标',
    enabled: true,
    datasource_id: 'ds_crm_postgres',
    sql: 'INSERT INTO order_metrics SELECT ... FROM orders',
    trigger: { mode: 'interval', every: 5, unit: 'minute' },
    last_run_at: new Date('2026-06-28T03:05:00.000Z'),
    next_run_at: new Date('2026-06-28T03:10:00.000Z'),
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: 'task_report',
    name: '周报快照',
    description: '每周生成报表快照',
    enabled: false,
    datasource_id: 'ds_order_oracle',
    sql: 'INSERT INTO weekly_report SELECT * FROM report_view',
    trigger: { mode: 'cron', expression: '0 8 * * 1' },
    last_run_at: null,
    next_run_at: null,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: 'task_health',
    name: '连接健康检查',
    description: null,
    enabled: true,
    datasource_id: 'ds_order_oracle',
    sql: 'SELECT 1',
    trigger: { mode: 'interval', every: 1, unit: 'hour' },
    last_run_at: new Date('2026-06-28T03:00:00.000Z'),
    next_run_at: new Date('2026-06-28T04:00:00.000Z'),
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
]

type TaskLogSeed = {
  id: string
  task_id: string
  started_at: Date
  trigger: 'auto' | 'manual'
  status: 'success' | 'failed'
  duration_ms: number
  affected_rows: number | null
  error: string | null
  created_at: Date
}

/** 复刻内存版 seedLogs：每任务 12 条确定性日志（started_at 按 index 递减，最新在前）。 */
function seedTaskLogs(taskId: string): TaskLogSeed[] {
  return Array.from({ length: 12 }).map((_, index) => {
    const failed = index % 5 === 2
    return {
      id: `${taskId}_run_${String(index + 1).padStart(3, '0')}`,
      task_id: taskId,
      started_at: new Date(Date.parse('2026-06-28T03:00:00.000Z') - index * 600_000),
      trigger: 'auto',
      status: failed ? 'failed' : 'success',
      duration_ms: failed ? 4200 : 80 + index * 7,
      affected_rows: failed ? null : index * 3,
      error: failed ? 'ER_LOCK_WAIT_TIMEOUT: lock wait timeout exceeded' : null,
      created_at: SEED_TIMESTAMP,
    }
  })
}

/** 幂等写入 demo 种子数据（按 id upsert）。 */
export async function seedDemoData(db: Kysely<Database>): Promise<void> {
  for (const project of SEED_PROJECTS) {
    await db
      .insertInto('project')
      .values(project)
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          code: project.code,
          name: project.name,
          description: project.description,
          icon: project.icon,
          color: project.color,
          status: project.status,
          api_count: project.api_count,
          updated_at: project.updated_at,
        }),
      )
      .execute()
  }

  for (const ds of SEED_DATASOURCES) {
    await db
      .insertInto('db_source')
      .values(ds)
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          name: ds.name,
          dialect: ds.dialect,
          host: ds.host,
          port: ds.port,
          database: ds.database,
          username: ds.username,
          password: ds.password,
          description: ds.description,
          updated_at: ds.updated_at,
        }),
      )
      .execute()
  }

  for (const variable of SEED_VARIABLES) {
    // items 是 jsonb 数组：pg 对 JS 数组按 PG 数组格式序列化（非 JSON），必须先 JSON.stringify。
    const values = {
      id: variable.id,
      scope: variable.scope,
      project_id: variable.project_id,
      name: variable.name,
      label: variable.label,
      kind: variable.kind,
      value: variable.value,
      items: jsonbArray(variable.items),
      description: variable.description,
      created_at: variable.created_at,
      updated_at: variable.updated_at,
    }
    await db
      .insertInto('variable')
      .values(values)
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          scope: values.scope,
          project_id: values.project_id,
          name: values.name,
          label: values.label,
          kind: values.kind,
          value: values.value,
          items: values.items,
          description: values.description,
          updated_at: values.updated_at,
        }),
      )
      .execute()
  }

  for (const draft of SEED_APIS) {
    const id = draft.id
    if (!id) throw new Error('[seed] api draft 缺少 id')
    await db
      .insertInto('api')
      .values({
        id,
        project_id: draft.projectId,
        name: draft.name,
        path: draft.path,
        method: draft.method,
        status: draft.status,
        body_content_type: draft.bodyContentType,
        tags: jsonbArray(draft.tags),
        permissions: jsonbArray(draft.permissions),
        require_auth: draft.requireAuth,
        description: draft.description ?? null,
        request_params: jsonbArray(draft.requestParams),
        response_schema: jsonbArray(draft.responseSchema),
        local_variables: jsonbArray(draft.localVariables),
        workflow_steps: jsonbArray(draft.workflowSteps),
        created_at: SEED_TIMESTAMP,
        updated_at: SEED_TIMESTAMP,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          project_id: draft.projectId,
          name: draft.name,
          path: draft.path,
          method: draft.method,
          status: draft.status,
          body_content_type: draft.bodyContentType,
          tags: jsonbArray(draft.tags),
          permissions: jsonbArray(draft.permissions),
          require_auth: draft.requireAuth,
          description: draft.description ?? null,
          request_params: jsonbArray(draft.requestParams),
          response_schema: jsonbArray(draft.responseSchema),
          local_variables: jsonbArray(draft.localVariables),
          workflow_steps: jsonbArray(draft.workflowSteps),
          updated_at: SEED_TIMESTAMP,
        }),
      )
      .execute()
  }

  for (const task of SEED_TASKS) {
    await db
      .insertInto('schedule_task')
      .values(task)
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          name: task.name,
          description: task.description,
          enabled: task.enabled,
          datasource_id: task.datasource_id,
          sql: task.sql,
          trigger: task.trigger,
          last_run_at: task.last_run_at,
          next_run_at: task.next_run_at,
          updated_at: task.updated_at,
        }),
      )
      .execute()
  }

  for (const task of SEED_TASKS) {
    for (const log of seedTaskLogs(task.id)) {
      await db
        .insertInto('schedule_task_log')
        .values(log)
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            task_id: log.task_id,
            started_at: log.started_at,
            trigger: log.trigger,
            status: log.status,
            duration_ms: log.duration_ms,
            affected_rows: log.affected_rows,
            error: log.error,
          }),
        )
        .execute()
    }
  }

  // 调用日志：复刻 mockInvocationLogs（demo 数据），invoked_at 以 UTC 存（naive datetime 视作 UTC），
  // 便于 home-overview 的日期过滤用 UTC 边界比较、时区无关。
  for (const log of mockInvocationLogs) {
    const invokedAt = new Date(log.invokedAt.replace(' ', 'T') + '.000Z')
    await db
      .insertInto('api_invocation_log')
      .values({
        id: log.id,
        api_id: null,
        project_id: null,
        kind: 'invoke',
        invoked_at: invokedAt,
        method: log.method,
        path: log.path,
        api_name: log.apiName ?? null,
        status_code: log.statusCode,
        status: log.status,
        duration_ms: log.durationMs,
        request_params: null,
        response_body: null,
        error_detail: null,
        steps: null,
        created_at: invokedAt,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          kind: 'invoke',
          invoked_at: invokedAt,
          method: log.method,
          path: log.path,
          api_name: log.apiName ?? null,
          status_code: log.statusCode,
          status: log.status,
          duration_ms: log.durationMs,
        }),
      )
      .execute()
  }
}

export const SEED_PROJECT_COUNT = SEED_PROJECTS.length
export const SEED_DATASOURCE_COUNT = SEED_DATASOURCES.length
export const SEED_VARIABLE_COUNT = SEED_VARIABLES.length
export const SEED_API_COUNT = SEED_APIS.length
export const SEED_TASK_COUNT = SEED_TASKS.length
export const SEED_INVOCATION_LOG_COUNT = mockInvocationLogs.length