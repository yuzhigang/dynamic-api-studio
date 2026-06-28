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
    sql: "DELETE FROM tmp_order_snapshot WHERE created_at < NOW() - INTERVAL '1 day'",
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
