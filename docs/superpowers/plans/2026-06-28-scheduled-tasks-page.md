# 定时任务（Scheduled Tasks）页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `/tasks` 定时任务页面：左侧列出所有任务（默认选中第一个），右侧为所选任务的「设置」与「运行日志」两个标签页，数据由 Hono mock 后端提供。

**Architecture:** 路由驱动选择（`/tasks/$taskId` 设置、`/tasks/$taskId/logs` 运行日志），三个路由渲染同一个 `TaskWorkspacePage`，标签由 pathname 决定，复用既有 `ProjectDetailPage` 的 master-detail 模式。后端为内存仓储 + Hono 路由（仿 `projectRoute`），不实现真实调度器，「立即运行」与种子数据模拟执行。

**Tech Stack:** TypeScript、React 18、TanStack Router/Query、Zod、Hono、shadcn/ui、Vitest。

> **本仓库非 git 仓库**，故无 `git commit` 步骤。每个任务以 `pnpm typecheck` / `pnpm lint` / `pnpm test` 作为验证检查点。

> **相对 spec 的微调（更清爽）：** 「启用开关」只放在右侧面板头部（点击即时保存），设置表单**不含**启用字段，避免同一字段两处编辑。其余与 spec 一致。

---

## File Structure

**新建 — 共享层**
- `src/shared/schemas/scheduled-task.schema.ts` — Zod schema + 推导类型（Trigger / ScheduledTask / Draft / RunLog / MockDataSource）
- `src/shared/contracts/scheduled-task.contract.ts` — 再导出类型 + schema

**新建 — 后端**
- `src/server/domains/scheduled-task/mock-data-sources.ts` — mock 数据源列表
- `src/server/domains/scheduled-task/scheduled-task.repository.ts` — 内存仓储（任务 + 运行日志 + 立即运行）
- `src/server/domains/scheduled-task/scheduled-task.service.ts` — 薄服务层
- `src/server/routes/task.route.ts` — Hono 路由
- `src/server/routes/task.route.test.ts` — 路由测试
- 修改 `src/server/app.ts` — 注册 `/tasks` 路由

**新建 — 前端模块 `src/modules/scheduled-task/`**
- `model/scheduled-task.types.ts` — 视图辅助类型 + 再导出
- `utils/describe-trigger.ts` + `utils/describe-trigger.test.ts` — 触发摘要/校验
- `utils/create-empty-task.ts` — 新建任务默认草稿
- `services/scheduled-task.api.ts` — apiFetch 封装
- `services/scheduled-task-query-keys.ts` — query keys
- `hooks/use-task-query.ts`、`use-task-logs-query.ts`、`use-save-task.ts`、`use-run-task.ts`、`use-data-sources-query.ts`
- `components/task-workspace/task-list-item.tsx`、`task-sidebar.tsx`、`task-trigger-fields.tsx`、`task-settings-tab.tsx`、`task-run-log-tab.tsx`、`task-main-panel.tsx`
- `pages/task-workspace-page.tsx`
- `index.ts`

**新建 — 路由**
- `src/routes/_app/tasks/index.tsx`、`src/routes/_app/tasks/$taskId/index.tsx`、`src/routes/_app/tasks/$taskId/logs.tsx`
- 修改 `src/app/router.tsx` — 注册路由子树

---

## Task 1: 共享 schema 与 contract

**Files:**
- Create: `src/shared/schemas/scheduled-task.schema.ts`
- Create: `src/shared/contracts/scheduled-task.contract.ts`
- Test: `src/shared/schemas/scheduled-task.schema.test.ts`

- [ ] **Step 1: 写失败测试**

`src/shared/schemas/scheduled-task.schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  scheduledTaskDraftSchema,
  triggerSchema,
} from '@/shared/schemas/scheduled-task.schema'

describe('scheduled-task schema', () => {
  it('accepts a cron trigger', () => {
    expect(triggerSchema.parse({ mode: 'cron', expression: '0 2 * * *' })).toEqual({
      mode: 'cron',
      expression: '0 2 * * *',
    })
  })

  it('accepts an interval trigger', () => {
    expect(
      triggerSchema.parse({ mode: 'interval', every: 5, unit: 'minute' }),
    ).toEqual({ mode: 'interval', every: 5, unit: 'minute' })
  })

  it('rejects interval every < 1', () => {
    expect(() => triggerSchema.parse({ mode: 'interval', every: 0, unit: 'minute' })).toThrow()
  })

  it('rejects a draft without name', () => {
    expect(() =>
      scheduledTaskDraftSchema.parse({
        enabled: true,
        dataSourceId: 'ds_pg',
        sql: 'select 1',
        trigger: { mode: 'cron', expression: '* * * * *' },
      }),
    ).toThrow()
  })

  it('accepts a valid draft', () => {
    const draft = {
      name: '每日清理',
      enabled: true,
      dataSourceId: 'ds_pg',
      sql: 'delete from tmp',
      trigger: { mode: 'interval' as const, every: 1, unit: 'day' as const },
    }
    expect(scheduledTaskDraftSchema.parse(draft)).toMatchObject(draft)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- scheduled-task.schema`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 schema**

`src/shared/schemas/scheduled-task.schema.ts`:

```ts
import { z } from 'zod'

export const triggerSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('cron'), expression: z.string().min(1) }),
  z.object({
    mode: z.literal('interval'),
    every: z.number().int().min(1),
    unit: z.enum(['minute', 'hour', 'day']),
  }),
])

export const taskRunStatusSchema = z.enum(['success', 'failed', 'running'])
export const taskRunTriggerSchema = z.enum(['auto', 'manual'])

export const scheduledTaskSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
  dataSourceId: z.string().min(1),
  sql: z.string(),
  trigger: triggerSchema,
  lastRunAt: z.string().optional(),
  nextRunAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const scheduledTaskDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
  dataSourceId: z.string().min(1),
  sql: z.string(),
  trigger: triggerSchema,
})

export const taskRunLogSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  startedAt: z.string(),
  trigger: taskRunTriggerSchema,
  status: taskRunStatusSchema,
  durationMs: z.number(),
  affectedRows: z.number().optional(),
  error: z.string().optional(),
})

export const mockDataSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  dialect: z.string(),
})

export type Trigger = z.infer<typeof triggerSchema>
export type TriggerMode = Trigger['mode']
export type ScheduledTask = z.infer<typeof scheduledTaskSchema>
export type ScheduledTaskDraft = z.infer<typeof scheduledTaskDraftSchema>
export type TaskRunLog = z.infer<typeof taskRunLogSchema>
export type TaskRunStatus = z.infer<typeof taskRunStatusSchema>
export type MockDataSource = z.infer<typeof mockDataSourceSchema>
```

- [ ] **Step 4: 实现 contract**

`src/shared/contracts/scheduled-task.contract.ts`:

```ts
export type {
  MockDataSource,
  ScheduledTask,
  ScheduledTaskDraft,
  TaskRunLog,
  TaskRunStatus,
  Trigger,
  TriggerMode,
} from '@/shared/schemas/scheduled-task.schema'

export {
  mockDataSourceSchema,
  scheduledTaskDraftSchema,
  scheduledTaskSchema,
  taskRunLogSchema,
  triggerSchema,
} from '@/shared/schemas/scheduled-task.schema'
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm test -- scheduled-task.schema`
Expected: PASS（5 个用例）

---

## Task 2: 后端仓储 + 服务 + mock 数据源

**Files:**
- Create: `src/server/domains/scheduled-task/mock-data-sources.ts`
- Create: `src/server/domains/scheduled-task/scheduled-task.repository.ts`
- Create: `src/server/domains/scheduled-task/scheduled-task.service.ts`

- [ ] **Step 1: 实现 mock 数据源**

`src/server/domains/scheduled-task/mock-data-sources.ts`:

```ts
import type { MockDataSource } from '@/shared/contracts/scheduled-task.contract'

export const mockDataSources: MockDataSource[] = [
  { id: 'ds_pg', name: '主库（PostgreSQL）', dialect: 'postgresql' },
  { id: 'ds_mysql', name: '订单库（MySQL）', dialect: 'mysql' },
  { id: 'ds_report', name: '报表库（PostgreSQL）', dialect: 'postgresql' },
]
```

- [ ] **Step 2: 实现仓储**

`src/server/domains/scheduled-task/scheduled-task.repository.ts`:

```ts
import type {
  ScheduledTask,
  ScheduledTaskDraft,
  TaskRunLog,
} from '@/shared/contracts/scheduled-task.contract'

const now = '2026-06-28T00:00:00.000Z'

const seedTasks: ScheduledTask[] = [
  {
    id: 'task_cleanup',
    name: '每日临时表清理',
    description: '凌晨清理临时表数据',
    enabled: true,
    dataSourceId: 'ds_pg',
    sql: 'DELETE FROM tmp_order_snapshot WHERE created_at < NOW() - INTERVAL \'1 day\'',
    trigger: { mode: 'cron', expression: '0 2 * * *' },
    lastRunAt: '2026-06-28T02:00:00.000Z',
    nextRunAt: '2026-06-29T02:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task_sync',
    name: '订单指标同步',
    description: '每 5 分钟刷新订单聚合指标',
    enabled: true,
    dataSourceId: 'ds_mysql',
    sql: 'INSERT INTO order_metrics SELECT ... FROM orders',
    trigger: { mode: 'interval', every: 5, unit: 'minute' },
    lastRunAt: '2026-06-28T03:05:00.000Z',
    nextRunAt: '2026-06-28T03:10:00.000Z',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task_report',
    name: '周报快照',
    description: '每周生成报表快照',
    enabled: false,
    dataSourceId: 'ds_report',
    sql: 'INSERT INTO weekly_report SELECT * FROM report_view',
    trigger: { mode: 'cron', expression: '0 8 * * 1' },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task_health',
    name: '连接健康检查',
    enabled: true,
    dataSourceId: 'ds_pg',
    sql: 'SELECT 1',
    trigger: { mode: 'interval', every: 1, unit: 'hour' },
    lastRunAt: '2026-06-28T03:00:00.000Z',
    nextRunAt: '2026-06-28T04:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  },
]

function seedLogs(taskId: string): TaskRunLog[] {
  return Array.from({ length: 12 }).map((_, index) => {
    const failed = index % 5 === 2
    return {
      id: `${taskId}_run_${String(index + 1).padStart(3, '0')}`,
      taskId,
      startedAt: new Date(Date.parse('2026-06-28T03:00:00.000Z') - index * 600_000).toISOString(),
      trigger: 'auto' as const,
      status: failed ? ('failed' as const) : ('success' as const),
      durationMs: failed ? 4200 : 80 + index * 7,
      affectedRows: failed ? undefined : index * 3,
      error: failed ? 'ER_LOCK_WAIT_TIMEOUT: lock wait timeout exceeded' : undefined,
    }
  })
}

export class ScheduledTaskRepository {
  private tasks = new Map(seedTasks.map((task) => [task.id, task]))
  private logs = new Map<string, TaskRunLog[]>(seedTasks.map((task) => [task.id, seedLogs(task.id)]))

  list() {
    return Array.from(this.tasks.values())
  }

  get(taskId: string) {
    return this.tasks.get(taskId)
  }

  save(draft: ScheduledTaskDraft) {
    const timestamp = new Date().toISOString()
    const id = draft.id ?? `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const existing = this.tasks.get(id)
    const task: ScheduledTask = {
      id,
      name: draft.name,
      description: draft.description,
      enabled: draft.enabled,
      dataSourceId: draft.dataSourceId,
      sql: draft.sql,
      trigger: draft.trigger,
      lastRunAt: existing?.lastRunAt,
      nextRunAt: existing?.nextRunAt,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    this.tasks.set(id, task)
    if (!this.logs.has(id)) {
      this.logs.set(id, [])
    }
    return task
  }

  remove(taskId: string) {
    const existed = this.tasks.delete(taskId)
    this.logs.delete(taskId)
    return existed
  }

  listLogs(taskId: string, page: number, pageSize: number) {
    const all = this.logs.get(taskId) ?? []
    const start = (page - 1) * pageSize
    return { items: all.slice(start, start + pageSize), total: all.length, page, pageSize }
  }

  run(taskId: string): TaskRunLog | undefined {
    const task = this.tasks.get(taskId)
    if (!task) {
      return undefined
    }
    const timestamp = new Date().toISOString()
    const log: TaskRunLog = {
      id: `${taskId}_run_${Date.now()}`,
      taskId,
      startedAt: timestamp,
      trigger: 'manual',
      status: 'success',
      durationMs: 60 + Math.floor(Math.random() * 200),
      affectedRows: Math.floor(Math.random() * 50),
    }
    const existing = this.logs.get(taskId) ?? []
    this.logs.set(taskId, [log, ...existing])
    this.tasks.set(taskId, { ...task, lastRunAt: timestamp, updatedAt: timestamp })
    return log
  }
}
```

- [ ] **Step 3: 实现服务**

`src/server/domains/scheduled-task/scheduled-task.service.ts`:

```ts
import type { ScheduledTaskRepository } from '@/server/domains/scheduled-task/scheduled-task.repository'
import type { ScheduledTaskDraft } from '@/shared/contracts/scheduled-task.contract'

export class ScheduledTaskService {
  constructor(private readonly repository: ScheduledTaskRepository) {}

  list() {
    return this.repository.list()
  }

  get(taskId: string) {
    return this.repository.get(taskId)
  }

  save(draft: ScheduledTaskDraft) {
    return this.repository.save(draft)
  }

  remove(taskId: string) {
    return this.repository.remove(taskId)
  }

  listLogs(taskId: string, page: number, pageSize: number) {
    return this.repository.listLogs(taskId, page, pageSize)
  }

  run(taskId: string) {
    return this.repository.run(taskId)
  }
}
```

- [ ] **Step 4: 验证类型**

Run: `pnpm typecheck`
Expected: 通过（无新错误）

---

## Task 3: 后端路由 + 注册 + 测试

**Files:**
- Create: `src/server/routes/task.route.ts`
- Create: `src/server/routes/task.route.test.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 1: 实现路由**

`src/server/routes/task.route.ts`:

```ts
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { mockDataSources } from '@/server/domains/scheduled-task/mock-data-sources'
import { ScheduledTaskRepository } from '@/server/domains/scheduled-task/scheduled-task.repository'
import { ScheduledTaskService } from '@/server/domains/scheduled-task/scheduled-task.service'
import { scheduledTaskDraftSchema } from '@/shared/contracts/scheduled-task.contract'

export const scheduledTaskRepository = new ScheduledTaskRepository()

const service = new ScheduledTaskService(scheduledTaskRepository)

const logQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

export const taskRoute = new Hono()
  .get('/', (context) => context.json(service.list()))
  // 注意：/datasources 必须在 /:taskId 之前注册，否则会被参数路由吞掉
  .get('/datasources', (context) => context.json(mockDataSources))
  .post('/', zValidator('json', scheduledTaskDraftSchema), (context) =>
    context.json(service.save(context.req.valid('json'))),
  )
  .get('/:taskId', (context) => {
    const task = service.get(context.req.param('taskId'))
    return task ? context.json(task) : context.json({ message: 'Task not found' }, 404)
  })
  .put('/:taskId', zValidator('json', scheduledTaskDraftSchema), (context) =>
    context.json(service.save({ ...context.req.valid('json'), id: context.req.param('taskId') })),
  )
  .delete('/:taskId', (context) => {
    const removed = service.remove(context.req.param('taskId'))
    return removed ? context.json({ ok: true }) : context.json({ message: 'Task not found' }, 404)
  })
  .get('/:taskId/logs', zValidator('query', logQuerySchema), (context) => {
    const { page, pageSize } = context.req.valid('query')
    return context.json(service.listLogs(context.req.param('taskId'), page, pageSize))
  })
  .post('/:taskId/run', (context) => {
    const log = service.run(context.req.param('taskId'))
    return log ? context.json(log) : context.json({ message: 'Task not found' }, 404)
  })
```

- [ ] **Step 2: 注册路由**

修改 `src/server/app.ts`：在 import 区加入

```ts
import { taskRoute } from '@/server/routes/task.route'
```

并在路由链中（紧随 `.route('/projects', projectApiRoute)` 之后）加入：

```ts
  .route('/tasks', taskRoute)
```

- [ ] **Step 3: 写路由测试**

`src/server/routes/task.route.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { taskRoute } from '@/server/routes/task.route'

const validDraft = {
  name: '测试任务',
  enabled: true,
  dataSourceId: 'ds_pg',
  sql: 'SELECT 1',
  trigger: { mode: 'cron', expression: '0 * * * *' },
}

describe('task.route', () => {
  it('lists seeded tasks', async () => {
    const response = await taskRoute.request('/')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  it('returns the mock data sources (not swallowed by /:taskId)', async () => {
    const response = await taskRoute.request('/datasources')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.map((source: { id: string }) => source.id)).toContain('ds_pg')
  })

  it('returns a task by id', async () => {
    const response = await taskRoute.request('/task_cleanup')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.name).toBe('每日临时表清理')
  })

  it('404s for unknown task', async () => {
    const response = await taskRoute.request('/nope')
    expect(response.status).toBe(404)
  })

  it('creates a task', async () => {
    const response = await taskRoute.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validDraft),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBeTruthy()
    expect(body.name).toBe('测试任务')
  })

  it('rejects an invalid draft (interval every < 1)', async () => {
    const response = await taskRoute.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...validDraft, trigger: { mode: 'interval', every: 0, unit: 'minute' } }),
    })
    expect(response.status).toBe(400)
  })

  it('paginates run logs', async () => {
    const response = await taskRoute.request('/task_cleanup/logs?page=1&pageSize=5')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.items).toHaveLength(5)
    expect(body.total).toBeGreaterThan(5)
    expect(body.page).toBe(1)
  })

  it('runs a task and appends a manual log', async () => {
    const before = await (await taskRoute.request('/task_health/logs?page=1&pageSize=100')).json()
    const runResponse = await taskRoute.request('/task_health/run', { method: 'POST' })
    expect(runResponse.status).toBe(200)
    const log = await runResponse.json()
    expect(log.trigger).toBe('manual')
    const after = await (await taskRoute.request('/task_health/logs?page=1&pageSize=100')).json()
    expect(after.total).toBe(before.total + 1)
  })

  it('deletes a task', async () => {
    const created = await (
      await taskRoute.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validDraft),
      })
    ).json()
    const response = await taskRoute.request(`/${created.id}`, { method: 'DELETE' })
    expect(response.status).toBe(200)
    const check = await taskRoute.request(`/${created.id}`)
    expect(check.status).toBe(404)
  })
})
```

- [ ] **Step 4: 运行测试**

Run: `pnpm test -- task.route`
Expected: PASS（9 个用例）

---

## Task 4: describe-trigger 工具 + 测试

**Files:**
- Create: `src/modules/scheduled-task/utils/describe-trigger.ts`
- Test: `src/modules/scheduled-task/utils/describe-trigger.test.ts`

- [ ] **Step 1: 写失败测试**

`src/modules/scheduled-task/utils/describe-trigger.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { describeTrigger, isValidCron } from '@/modules/scheduled-task/utils/describe-trigger'

describe('describeTrigger', () => {
  it('describes an interval trigger in Chinese', () => {
    expect(describeTrigger({ mode: 'interval', every: 5, unit: 'minute' })).toBe('每 5 分钟')
    expect(describeTrigger({ mode: 'interval', every: 2, unit: 'hour' })).toBe('每 2 小时')
    expect(describeTrigger({ mode: 'interval', every: 1, unit: 'day' })).toBe('每 1 天')
  })

  it('describes a cron trigger', () => {
    expect(describeTrigger({ mode: 'cron', expression: '0 2 * * *' })).toBe('Cron：0 2 * * *')
  })
})

describe('isValidCron', () => {
  it('accepts 5-segment expressions', () => {
    expect(isValidCron('0 2 * * *')).toBe(true)
  })

  it('rejects wrong segment counts and empty', () => {
    expect(isValidCron('0 2 * *')).toBe(false)
    expect(isValidCron('')).toBe(false)
    expect(isValidCron('   ')).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- describe-trigger`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现工具**

`src/modules/scheduled-task/utils/describe-trigger.ts`:

```ts
import type { Trigger } from '@/shared/contracts/scheduled-task.contract'

const unitLabels: Record<Extract<Trigger, { mode: 'interval' }>['unit'], string> = {
  minute: '分钟',
  hour: '小时',
  day: '天',
}

export function describeTrigger(trigger: Trigger): string {
  if (trigger.mode === 'cron') {
    return `Cron：${trigger.expression}`
  }
  return `每 ${trigger.every} ${unitLabels[trigger.unit]}`
}

export function isValidCron(expression: string): boolean {
  const segments = expression.trim().split(/\s+/)
  return expression.trim().length > 0 && segments.length === 5
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test -- describe-trigger`
Expected: PASS

---

## Task 5: 前端模型、服务、query keys、create-empty-task

**Files:**
- Create: `src/modules/scheduled-task/model/scheduled-task.types.ts`
- Create: `src/modules/scheduled-task/utils/create-empty-task.ts`
- Create: `src/modules/scheduled-task/services/scheduled-task-query-keys.ts`
- Create: `src/modules/scheduled-task/services/scheduled-task.api.ts`

- [ ] **Step 1: 模型再导出**

`src/modules/scheduled-task/model/scheduled-task.types.ts`:

```ts
export type {
  MockDataSource,
  ScheduledTask,
  ScheduledTaskDraft,
  TaskRunLog,
  TaskRunStatus,
  Trigger,
  TriggerMode,
} from '@/shared/contracts/scheduled-task.contract'

export type TaskLogsResponse = {
  items: import('@/shared/contracts/scheduled-task.contract').TaskRunLog[]
  total: number
  page: number
  pageSize: number
}
```

- [ ] **Step 2: create-empty-task**

`src/modules/scheduled-task/utils/create-empty-task.ts`:

```ts
import type { ScheduledTaskDraft } from '@/shared/contracts/scheduled-task.contract'

export function createEmptyTask(): ScheduledTaskDraft {
  return {
    name: '新建任务',
    description: '',
    enabled: false,
    dataSourceId: '',
    sql: '',
    trigger: { mode: 'interval', every: 5, unit: 'minute' },
  }
}
```

- [ ] **Step 3: query keys**

`src/modules/scheduled-task/services/scheduled-task-query-keys.ts`:

```ts
export const scheduledTaskQueryKeys = {
  all: ['scheduled-task'] as const,
  tasks: () => [...scheduledTaskQueryKeys.all, 'tasks'] as const,
  task: (taskId: string) => [...scheduledTaskQueryKeys.tasks(), taskId] as const,
  logs: (taskId: string, page: number, pageSize: number) =>
    [...scheduledTaskQueryKeys.task(taskId), 'logs', { page, pageSize }] as const,
  dataSources: () => [...scheduledTaskQueryKeys.all, 'data-sources'] as const,
}
```

- [ ] **Step 4: api 客户端**

`src/modules/scheduled-task/services/scheduled-task.api.ts`:

```ts
import { apiFetch } from '@/lib/api-fetch'
import type { TaskLogsResponse } from '@/modules/scheduled-task/model/scheduled-task.types'
import type {
  MockDataSource,
  ScheduledTask,
  ScheduledTaskDraft,
  TaskRunLog,
} from '@/shared/contracts/scheduled-task.contract'

export function listTasks() {
  return apiFetch<ScheduledTask[]>('/api/tasks')
}

export function getTask(taskId: string) {
  return apiFetch<ScheduledTask>(`/api/tasks/${taskId}`)
}

export function saveTask(task: ScheduledTaskDraft) {
  return apiFetch<ScheduledTask>(task.id ? `/api/tasks/${task.id}` : '/api/tasks', {
    method: task.id ? 'PUT' : 'POST',
    body: JSON.stringify(task),
  })
}

export function deleteTask(taskId: string) {
  return apiFetch<{ ok: true }>(`/api/tasks/${taskId}`, { method: 'DELETE' })
}

export function runTask(taskId: string) {
  return apiFetch<TaskRunLog>(`/api/tasks/${taskId}/run`, { method: 'POST' })
}

export function getTaskLogs(taskId: string, page = 1, pageSize = 10) {
  return apiFetch<TaskLogsResponse>(`/api/tasks/${taskId}/logs?page=${page}&pageSize=${pageSize}`)
}

export function listDataSources() {
  return apiFetch<MockDataSource[]>('/api/tasks/datasources')
}
```

- [ ] **Step 5: 验证类型**

Run: `pnpm typecheck`
Expected: 通过

---

## Task 6: 前端 hooks

**Files:**
- Create: `src/modules/scheduled-task/hooks/use-task-query.ts`
- Create: `src/modules/scheduled-task/hooks/use-task-logs-query.ts`
- Create: `src/modules/scheduled-task/hooks/use-data-sources-query.ts`
- Create: `src/modules/scheduled-task/hooks/use-save-task.ts`
- Create: `src/modules/scheduled-task/hooks/use-run-task.ts`

- [ ] **Step 1: 查询 hooks**

`src/modules/scheduled-task/hooks/use-task-query.ts`:

```ts
import { useQuery } from '@tanstack/react-query'

import { getTask, listTasks } from '@/modules/scheduled-task/services/scheduled-task.api'
import { scheduledTaskQueryKeys } from '@/modules/scheduled-task/services/scheduled-task-query-keys'

export function useTaskListQuery() {
  return useQuery({
    queryKey: scheduledTaskQueryKeys.tasks(),
    queryFn: listTasks,
  })
}

export function useTaskQuery(taskId: string) {
  return useQuery({
    queryKey: scheduledTaskQueryKeys.task(taskId),
    queryFn: () => getTask(taskId),
    enabled: Boolean(taskId),
  })
}
```

`src/modules/scheduled-task/hooks/use-task-logs-query.ts`:

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getTaskLogs } from '@/modules/scheduled-task/services/scheduled-task.api'
import { scheduledTaskQueryKeys } from '@/modules/scheduled-task/services/scheduled-task-query-keys'

export function useTaskLogsQuery(taskId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: scheduledTaskQueryKeys.logs(taskId, page, pageSize),
    queryFn: () => getTaskLogs(taskId, page, pageSize),
    enabled: Boolean(taskId),
    placeholderData: keepPreviousData,
  })
}
```

`src/modules/scheduled-task/hooks/use-data-sources-query.ts`:

```ts
import { useQuery } from '@tanstack/react-query'

import { listDataSources } from '@/modules/scheduled-task/services/scheduled-task.api'
import { scheduledTaskQueryKeys } from '@/modules/scheduled-task/services/scheduled-task-query-keys'

export function useDataSourcesQuery() {
  return useQuery({
    queryKey: scheduledTaskQueryKeys.dataSources(),
    queryFn: listDataSources,
    staleTime: Infinity,
  })
}
```

- [ ] **Step 2: mutation hooks**

`src/modules/scheduled-task/hooks/use-save-task.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveTask } from '@/modules/scheduled-task/services/scheduled-task.api'
import { scheduledTaskQueryKeys } from '@/modules/scheduled-task/services/scheduled-task-query-keys'

export function useSaveTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveTask,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: scheduledTaskQueryKeys.tasks() })
      queryClient.setQueryData(scheduledTaskQueryKeys.task(task.id), task)
    },
  })
}
```

`src/modules/scheduled-task/hooks/use-run-task.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { runTask } from '@/modules/scheduled-task/services/scheduled-task.api'
import { scheduledTaskQueryKeys } from '@/modules/scheduled-task/services/scheduled-task-query-keys'

export function useRunTask(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => runTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledTaskQueryKeys.task(taskId) })
      queryClient.invalidateQueries({ queryKey: scheduledTaskQueryKeys.tasks() })
      queryClient.invalidateQueries({ queryKey: [...scheduledTaskQueryKeys.task(taskId), 'logs'] })
    },
  })
}
```

- [ ] **Step 3: 验证类型**

Run: `pnpm typecheck`
Expected: 通过

---

## Task 7: 左侧列表组件

**Files:**
- Create: `src/modules/scheduled-task/components/task-workspace/task-list-item.tsx`
- Create: `src/modules/scheduled-task/components/task-workspace/task-sidebar.tsx`

- [ ] **Step 1: task-list-item**

`src/modules/scheduled-task/components/task-workspace/task-list-item.tsx`:

```tsx
import { cn } from '@/lib/cn'
import { describeTrigger } from '@/modules/scheduled-task/utils/describe-trigger'
import type { ScheduledTask } from '@/shared/contracts/scheduled-task.contract'

type TaskListItemProps = {
  task: ScheduledTask
  active?: boolean
  onSelect: () => void
}

export function TaskListItem({ task, active, onSelect }: TaskListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1 rounded-md border bg-white px-3 py-2.5 text-left transition-colors',
        active ? 'border-primary ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            task.enabled ? 'bg-emerald-500' : 'bg-slate-300',
          )}
        />
        <span className="truncate text-sm font-medium text-slate-800">{task.name}</span>
      </div>
      <span className="truncate pl-4 text-xs text-slate-500">{describeTrigger(task.trigger)}</span>
    </button>
  )
}
```

- [ ] **Step 2: task-sidebar**

`src/modules/scheduled-task/components/task-workspace/task-sidebar.tsx`:

```tsx
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TaskListItem } from '@/modules/scheduled-task/components/task-workspace/task-list-item'
import type { ScheduledTask } from '@/shared/contracts/scheduled-task.contract'

type TaskSidebarProps = {
  tasks: ScheduledTask[]
  selectedTaskId?: string
  loading?: boolean
  onSelectTask: (taskId: string) => void
  onCreateTask: () => void
}

export function TaskSidebar({
  tasks,
  selectedTaskId,
  loading,
  onSelectTask,
  onCreateTask,
}: TaskSidebarProps) {
  const [keyword, setKeyword] = useState('')
  const filtered = useMemo(() => {
    const value = keyword.trim().toLowerCase()
    if (!value) {
      return tasks
    }
    return tasks.filter((task) => task.name.toLowerCase().includes(value))
  }, [tasks, keyword])

  return (
    <aside className="flex min-h-0 w-[clamp(260px,24vw,320px)] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="space-y-3 border-b border-slate-200 p-3">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索任务名称"
            aria-label="搜索任务名称"
            autoComplete="off"
            className="pl-9"
          />
        </div>
        <Button className="w-full justify-start" onClick={onCreateTask}>
          <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
          新建任务
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {loading ? (
          <Card className="bg-white">
            <CardContent className="p-4 text-sm text-slate-500">加载任务中…</CardContent>
          </Card>
        ) : null}
        {!loading && filtered.length
          ? filtered.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                active={task.id === selectedTaskId}
                onSelect={() => onSelectTask(task.id)}
              />
            ))
          : null}
        {!loading && !filtered.length ? (
          <Card className="bg-white">
            <CardContent className="p-4 text-sm text-slate-500">暂无匹配任务</CardContent>
          </Card>
        ) : null}
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: 验证类型**

Run: `pnpm typecheck`
Expected: 通过

---

## Task 8: 触发字段 + 设置表单

**Files:**
- Create: `src/modules/scheduled-task/components/task-workspace/task-trigger-fields.tsx`
- Create: `src/modules/scheduled-task/components/task-workspace/task-settings-tab.tsx`

- [ ] **Step 1: 触发字段**

`src/modules/scheduled-task/components/task-workspace/task-trigger-fields.tsx`:

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { describeTrigger, isValidCron } from '@/modules/scheduled-task/utils/describe-trigger'
import type { Trigger } from '@/shared/contracts/scheduled-task.contract'

type TaskTriggerFieldsProps = {
  value: Trigger
  onChange: (trigger: Trigger) => void
}

const intervalUnits: Array<{ value: 'minute' | 'hour' | 'day'; label: string }> = [
  { value: 'minute', label: '分钟' },
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
]

export function TaskTriggerFields({ value, onChange }: TaskTriggerFieldsProps) {
  const cronInvalid = value.mode === 'cron' && !isValidCron(value.expression)

  return (
    <div className="space-y-3">
      <RadioGroup
        className="flex gap-6"
        value={value.mode}
        onValueChange={(mode) =>
          onChange(
            mode === 'cron'
              ? { mode: 'cron', expression: '0 2 * * *' }
              : { mode: 'interval', every: 5, unit: 'minute' },
          )
        }
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="interval" id="trigger-interval" />
          <Label htmlFor="trigger-interval">固定间隔</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="cron" id="trigger-cron" />
          <Label htmlFor="trigger-cron">Cron 表达式</Label>
        </div>
      </RadioGroup>

      {value.mode === 'interval' ? (
        <div className="flex items-end gap-2">
          <div className="flex w-28 flex-col gap-1.5">
            <Label htmlFor="trigger-every">间隔</Label>
            <Input
              id="trigger-every"
              inputMode="numeric"
              value={String(value.every)}
              onChange={(event) =>
                onChange({
                  ...value,
                  every: Math.max(1, Number(event.target.value.replace(/[^0-9]/g, '')) || 1),
                })
              }
            />
          </div>
          <div className="flex w-32 flex-col gap-1.5">
            <Label>单位</Label>
            <Select
              value={value.unit}
              onValueChange={(unit) => onChange({ ...value, unit: unit as typeof value.unit })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {intervalUnits.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trigger-expression">Cron 表达式</Label>
          <Input
            id="trigger-expression"
            value={value.expression}
            placeholder="分 时 日 月 周，如 0 2 * * *"
            onChange={(event) => onChange({ mode: 'cron', expression: event.target.value })}
          />
          {cronInvalid ? (
            <span className="text-xs text-red-600">Cron 表达式需为 5 段（分 时 日 月 周）</span>
          ) : null}
        </div>
      )}

      <p className="text-xs text-slate-500">调度预览：{describeTrigger(value)}</p>
    </div>
  )
}
```

- [ ] **Step 2: 设置表单**

`src/modules/scheduled-task/components/task-workspace/task-settings-tab.tsx`:

```tsx
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SqlEditor } from '@/modules/api-management/editors/sql-editor'
import { TaskTriggerFields } from '@/modules/scheduled-task/components/task-workspace/task-trigger-fields'
import { useDataSourcesQuery } from '@/modules/scheduled-task/hooks/use-data-sources-query'
import { useSaveTask } from '@/modules/scheduled-task/hooks/use-save-task'
import { isValidCron } from '@/modules/scheduled-task/utils/describe-trigger'
import type { ScheduledTask, ScheduledTaskDraft } from '@/shared/contracts/scheduled-task.contract'

type TaskSettingsTabProps = {
  task: ScheduledTask
}

function toDraft(task: ScheduledTask): ScheduledTaskDraft {
  return {
    id: task.id,
    name: task.name,
    description: task.description ?? '',
    enabled: task.enabled,
    dataSourceId: task.dataSourceId,
    sql: task.sql,
    trigger: task.trigger,
  }
}

export function TaskSettingsTab({ task }: TaskSettingsTabProps) {
  const [draft, setDraft] = useState<ScheduledTaskDraft>(() => toDraft(task))
  const dataSourcesQuery = useDataSourcesQuery()
  const saveTask = useSaveTask()

  // 切换任务时重置草稿
  useEffect(() => {
    setDraft(toDraft(task))
  }, [task])

  const cronInvalid = draft.trigger.mode === 'cron' && !isValidCron(draft.trigger.expression)
  const canSave = draft.name.trim().length > 0 && draft.dataSourceId.length > 0 && !cronInvalid

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-name">名称</Label>
        <Input
          id="task-name"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-desc">描述</Label>
        <Textarea
          id="task-desc"
          rows={2}
          value={draft.description ?? ''}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>数据源</Label>
        <Select
          value={draft.dataSourceId || undefined}
          onValueChange={(dataSourceId) => setDraft({ ...draft, dataSourceId })}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择数据源" />
          </SelectTrigger>
          <SelectContent>
            {(dataSourcesQuery.data ?? []).map((source) => (
              <SelectItem key={source.id} value={source.id}>
                {source.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>SQL</Label>
        <div className="overflow-hidden rounded-md border border-slate-200">
          <SqlEditor value={draft.sql} autoHeight onChange={(sql) => setDraft({ ...draft, sql })} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>触发方式</Label>
        <TaskTriggerFields
          value={draft.trigger}
          onChange={(trigger) => setDraft({ ...draft, trigger })}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={!canSave || saveTask.isPending} onClick={() => saveTask.mutate(draft)}>
          {saveTask.isPending ? '保存中…' : '保存'}
        </Button>
        {saveTask.isSuccess ? <span className="text-sm text-emerald-600">已保存</span> : null}
        {saveTask.isError ? <span className="text-sm text-red-600">保存失败</span> : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 验证类型**

Run: `pnpm typecheck`
Expected: 通过

---

## Task 9: 运行日志标签页

**Files:**
- Create: `src/modules/scheduled-task/components/task-workspace/task-run-log-tab.tsx`

- [ ] **Step 1: 实现运行日志表格**

`src/modules/scheduled-task/components/task-workspace/task-run-log-tab.tsx`:

```tsx
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { useTaskLogsQuery } from '@/modules/scheduled-task/hooks/use-task-logs-query'
import { formatDateTime } from '@/modules/invocation-log/utils/format-date-time'
import type { TaskRunStatus } from '@/shared/contracts/scheduled-task.contract'

const statusLabels: Record<TaskRunStatus, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
}

const statusClassNames: Record<TaskRunStatus, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
}

type TaskRunLogTabProps = {
  taskId: string
}

const pageSize = 10

export function TaskRunLogTab({ taskId }: TaskRunLogTabProps) {
  const [page, setPage] = useState(1)
  const query = useTaskLogsQuery(taskId, page, pageSize)

  // 切换任务时回到第一页
  useEffect(() => {
    setPage(1)
  }, [taskId])

  const logs = query.data?.items ?? []

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[190px]">开始时间</TableHead>
              <TableHead className="w-[110px]">触发方式</TableHead>
              <TableHead className="w-[110px]">状态</TableHead>
              <TableHead className="w-[120px]">耗时（ms）</TableHead>
              <TableHead className="w-[110px]">影响行数</TableHead>
              <TableHead>错误信息</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                  加载运行日志中…
                </TableCell>
              </TableRow>
            ) : null}
            {!query.isLoading &&
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-slate-700">
                    {formatDateTime(log.startedAt)}
                  </TableCell>
                  <TableCell>{log.trigger === 'manual' ? '手动' : '自动'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-semibold', statusClassNames[log.status])}
                    >
                      {statusLabels[log.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('font-semibold', log.durationMs >= 1000 && 'text-red-600')}>
                    {log.durationMs}
                  </TableCell>
                  <TableCell>{log.affectedRows ?? '-'}</TableCell>
                  <TableCell className="font-mono text-xs text-red-600">{log.error ?? '-'}</TableCell>
                </TableRow>
              ))}
            {!query.isLoading && !logs.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                  暂无运行日志
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {query.data && query.data.total > pageSize ? (
        <Pagination
          page={query.data.page}
          pageSize={pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}
```

> 注：`formatDateTime` 接受 ISO 字符串并格式化；运行日志 `startedAt` 为 ISO。复用 invocation-log 既有工具。

- [ ] **Step 2: 验证类型**

Run: `pnpm typecheck`
Expected: 通过

---

## Task 10: 右侧主面板

**Files:**
- Create: `src/modules/scheduled-task/components/task-workspace/task-main-panel.tsx`

- [ ] **Step 1: 实现主面板**

`src/modules/scheduled-task/components/task-workspace/task-main-panel.tsx`:

```tsx
import { Play, Power } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskRunLogTab } from '@/modules/scheduled-task/components/task-workspace/task-run-log-tab'
import { TaskSettingsTab } from '@/modules/scheduled-task/components/task-workspace/task-settings-tab'
import { useRunTask } from '@/modules/scheduled-task/hooks/use-run-task'
import { useSaveTask } from '@/modules/scheduled-task/hooks/use-save-task'
import { cn } from '@/lib/cn'
import type { ScheduledTask } from '@/shared/contracts/scheduled-task.contract'

export type TaskWorkspaceTab = 'settings' | 'logs'

const tabTriggerClass =
  'h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'

type TaskMainPanelProps = {
  task: ScheduledTask
  activeTab: TaskWorkspaceTab
  onTabChange: (tab: TaskWorkspaceTab) => void
}

export function TaskMainPanel({ task, activeTab, onTabChange }: TaskMainPanelProps) {
  const saveTask = useSaveTask()
  const runTask = useRunTask(task.id)

  const toggleEnabled = () => {
    saveTask.mutate({
      id: task.id,
      name: task.name,
      description: task.description ?? '',
      enabled: !task.enabled,
      dataSourceId: task.dataSourceId,
      sql: task.sql,
      trigger: task.trigger,
    })
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900">{task.name}</h1>
          {task.description ? (
            <p className="truncate text-sm text-slate-500">{task.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={saveTask.isPending}
            onClick={toggleEnabled}
            className={cn(task.enabled ? 'text-emerald-700' : 'text-slate-500')}
          >
            <Power aria-hidden="true" className="mr-1.5 h-4 w-4" />
            {task.enabled ? '已启用' : '已停用'}
          </Button>
          <Button size="sm" disabled={runTask.isPending} onClick={() => runTask.mutate()}>
            <Play aria-hidden="true" className="mr-1.5 h-4 w-4" />
            {runTask.isPending ? '运行中…' : '立即运行'}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as TaskWorkspaceTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-slate-200 px-5 pt-3">
          <TabsList className="h-9 bg-transparent p-0">
            <TabsTrigger value="settings" className={tabTriggerClass}>
              设置
            </TabsTrigger>
            <TabsTrigger value="logs" className={tabTriggerClass}>
              运行日志
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="settings" className="m-0 min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
          <TaskSettingsTab task={task} />
        </TabsContent>

        <TabsContent value="logs" className="m-0 min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
          {activeTab === 'logs' ? <TaskRunLogTab taskId={task.id} /> : null}
        </TabsContent>
      </Tabs>
    </section>
  )
}
```

- [ ] **Step 2: 验证类型**

Run: `pnpm typecheck`
Expected: 通过

---

## Task 11: 顶层页面 + 模块 index

**Files:**
- Create: `src/modules/scheduled-task/pages/task-workspace-page.tsx`
- Create: `src/modules/scheduled-task/index.ts`

- [ ] **Step 1: 顶层页面**

`src/modules/scheduled-task/pages/task-workspace-page.tsx`:

```tsx
import { useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'

import { AppPage } from '@/layouts/app-shell/app-page'
import { TaskMainPanel } from '@/modules/scheduled-task/components/task-workspace/task-main-panel'
import type { TaskWorkspaceTab } from '@/modules/scheduled-task/components/task-workspace/task-main-panel'
import { TaskSidebar } from '@/modules/scheduled-task/components/task-workspace/task-sidebar'
import { useTaskListQuery } from '@/modules/scheduled-task/hooks/use-task-query'

function getActiveTab(pathname: string): TaskWorkspaceTab {
  return pathname.endsWith('/logs') ? 'logs' : 'settings'
}

export function TaskWorkspacePage() {
  const { taskId = '' } = useParams({ strict: false }) as { taskId?: string }
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const listQuery = useTaskListQuery()
  const tasks = useMemo(() => listQuery.data ?? [], [listQuery.data])
  const selectedTaskId = taskId || tasks[0]?.id
  const selectedTask = tasks.find((task) => task.id === selectedTaskId)
  const activeTab = getActiveTab(pathname)

  // 无 taskId 或指向不存在的任务时，重定向到第一个任务
  useEffect(() => {
    if (!tasks.length) {
      return
    }
    const routeTaskExists = taskId && tasks.some((task) => task.id === taskId)
    if (!taskId || !routeTaskExists) {
      navigate({ to: '/tasks/$taskId', params: { taskId: tasks[0].id }, replace: true })
    }
  }, [taskId, tasks, navigate])

  return (
    <AppPage>
      <div className="h-full min-h-0">
        {listQuery.isLoading ? (
          <div className="p-5 text-sm text-slate-500">加载任务中…</div>
        ) : null}
        {!listQuery.isLoading && !tasks.length ? (
          <div className="p-5">
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              暂无定时任务。点击左侧「新建任务」创建第一个任务。
            </div>
          </div>
        ) : null}
        {selectedTask ? (
          <div className="flex h-full min-h-0 bg-slate-50">
            <TaskSidebar
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              loading={listQuery.isLoading}
              onSelectTask={(nextId) =>
                navigate({ to: '/tasks/$taskId', params: { taskId: nextId } })
              }
              onCreateTask={() => navigate({ to: '/tasks/$taskId', params: { taskId: tasks[0].id } })}
            />
            <TaskMainPanel
              task={selectedTask}
              activeTab={activeTab}
              onTabChange={(tab) => {
                if (tab === 'logs') {
                  navigate({ to: '/tasks/$taskId/logs', params: { taskId: selectedTask.id } })
                } else {
                  navigate({ to: '/tasks/$taskId', params: { taskId: selectedTask.id } })
                }
              }}
            />
          </div>
        ) : null}
      </div>
    </AppPage>
  )
}
```

> 说明：本期「新建任务」先跳到首个任务（占位）。真正的新建表单弹窗不在本期范围（YAGNI）；后端 `POST /api/tasks` 已就绪，后续可加 dialog。若希望本期即可创建，见 Task 11 备注下方可选增强。

- [ ] **Step 2: 模块 index**

`src/modules/scheduled-task/index.ts`:

```ts
export { TaskWorkspacePage } from '@/modules/scheduled-task/pages/task-workspace-page'
```

- [ ] **Step 3: 验证类型**

Run: `pnpm typecheck`
Expected: 通过（路由 `/tasks/$taskId` 尚未注册，TanStack 类型可能报错——将在 Task 12 注册后消除；若此步报路由类型错，先继续 Task 12 再回看）

---

## Task 12: 路由组件 + 注册

**Files:**
- Create: `src/routes/_app/tasks/index.tsx`
- Create: `src/routes/_app/tasks/$taskId/index.tsx`
- Create: `src/routes/_app/tasks/$taskId/logs.tsx`
- Modify: `src/app/router.tsx`

- [ ] **Step 1: 路由组件**

`src/routes/_app/tasks/index.tsx`:

```tsx
import { TaskWorkspacePage } from '@/modules/scheduled-task'

export function TasksRouteComponent() {
  return <TaskWorkspacePage />
}
```

`src/routes/_app/tasks/$taskId/index.tsx`:

```tsx
import { TaskWorkspacePage } from '@/modules/scheduled-task'

export function TaskDetailRouteComponent() {
  return <TaskWorkspacePage />
}
```

`src/routes/_app/tasks/$taskId/logs.tsx`:

```tsx
import { TaskWorkspacePage } from '@/modules/scheduled-task'

export function TaskLogsRouteComponent() {
  return <TaskWorkspacePage />
}
```

- [ ] **Step 2: 注册路由树**

修改 `src/app/router.tsx`。在 import 区加入：

```ts
import { TasksRouteComponent } from '@/routes/_app/tasks'
import { TaskDetailRouteComponent } from '@/routes/_app/tasks/$taskId'
import { TaskLogsRouteComponent } from '@/routes/_app/tasks/$taskId/logs'
```

在 `homeOverviewRoute` 定义之后、`projectsRoute` 之前（或任意 appRoute 子路由区）加入：

```ts
const tasksRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'tasks',
  component: () => <Outlet />,
})

const tasksIndexRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '/',
  component: TasksRouteComponent,
})

const taskDetailRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '$taskId',
  component: TaskDetailRouteComponent,
})

const taskLogsRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '$taskId/logs',
  component: TaskLogsRouteComponent,
})
```

在 `routeTree` 的 `appRoute.addChildren([...])` 中加入 `tasksRoute` 子树（与 `projectsRoute` 同级）：

```ts
    tasksRoute.addChildren([tasksIndexRoute, taskDetailRoute, taskLogsRoute]),
```

> `Outlet` 已在 router.tsx 顶部从 `@tanstack/react-router` 导入，无需重复导入。

- [ ] **Step 3: 验证类型**

Run: `pnpm typecheck`
Expected: 通过（Task 11 中的路由类型错误此时应消除）

- [ ] **Step 4: lint**

Run: `pnpm lint`
Expected: 通过

---

## Task 13: 全量验证与手动检查

- [ ] **Step 1: 全量测试**

Run: `pnpm test`
Expected: 全绿（含 task.route、schema、describe-trigger 新增用例）

- [ ] **Step 2: 类型 + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: 均通过

- [ ] **Step 3: 手动验收（启动 dev）**

Run: `pnpm dev`，浏览器打开 `http://localhost:5173/tasks`，逐项确认：

1. 访问 `/tasks` 自动跳到第一个任务并展示其「设置」
2. 左侧列出全部任务（名称 + 触发摘要 + 启用状态点），点击切换右侧内容且 URL 变化
3. 「设置」可改名称/描述/数据源/SQL/触发方式并「保存」，出现「已保存」
4. 头部「已启用/已停用」点击即时切换，左侧状态点同步
5. 切到「运行日志」分页展示历史；点「立即运行」后日志新增一条「手动/成功」记录
6. 切换 Cron/固定间隔，非法 Cron（非 5 段）显示红字校验，保存按钮禁用

- [ ] **Step 4: 标记完成**

确认以上全部通过后，本计划完成。

---

## 可选增强（不在本期范围，记录备忘）

- 新建任务弹窗（复用 `createEmptyTask` + `useSaveTask`，仿 `ProjectFormDialog`）
- 删除任务入口（`deleteTask` 已就绪）
- 真实 cron 解析与 `nextRunAt` 精确计算
- 接入真实数据源模块替换 mock 数据源
