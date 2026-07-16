import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import type { Database, ScheduleTaskLogTable, ScheduleTaskTable } from '@/server/infra/db/tables'
import type {
  ScheduledTask,
  ScheduledTaskDraft,
  TaskRunLog,
  Trigger,
} from '@/shared/contracts/scheduled-task.contract'

type TaskRow = Selectable<ScheduleTaskTable>
type LogRow = Selectable<ScheduleTaskLogTable>

function rowToTask(row: TaskRow): ScheduledTask {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    enabled: row.enabled,
    dataSourceId: row.datasource_id,
    sql: row.sql,
    trigger: row.trigger as Trigger,
    lastRunAt: row.last_run_at ? row.last_run_at.toISOString() : undefined,
    nextRunAt: row.next_run_at ? row.next_run_at.toISOString() : undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function rowToLog(row: LogRow): TaskRunLog {
  return {
    id: row.id,
    taskId: row.task_id,
    startedAt: row.started_at.toISOString(),
    trigger: row.trigger,
    status: row.status as TaskRunLog['status'],
    durationMs: row.duration_ms ?? 0,
    affectedRows: row.affected_rows ?? undefined,
    error: row.error ?? undefined,
  }
}

/**
 * ScheduledTask repository —— Kysely 实现，跨 schedule_task + schedule_task_log 两表。
 *
 * 语义对齐内存版：
 *  - `save` 为 upsert（保留 created_at/last_run_at/next_run_at；draft 不含后两者）。
 *  - `remove` 软删除 schedule_task（row 留存、deleted_at 置位；logs 不动——FK 仍满足，list/get 过滤软删除）。
 *  - `listLogs` 按 started_at desc 分页；`run` 插入一条 manual 成功日志并更新 last_run_at，返回该日志。
 *
 * `trigger` 是 jsonb 对象（非数组），pg 自动 stringify 对象，写库直接传；读回 cast 到 Trigger。
 * FK：datasource_id→db_source.id（须存在）；schedule_task_log.task_id→schedule_task.id（ON DELETE CASCADE）。
 */
export class ScheduledTaskRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(): Promise<ScheduledTask[]> {
    const rows = await this.db
      .selectFrom('schedule_task')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(rowToTask)
  }

  async get(taskId: string): Promise<ScheduledTask | undefined> {
    const row = await this.db
      .selectFrom('schedule_task')
      .selectAll()
      .where('id', '=', taskId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? rowToTask(row) : undefined
  }

  async save(draft: ScheduledTaskDraft): Promise<ScheduledTask> {
    const id = draft.id ?? createId('task')
    const now = new Date()
    await this.db
      .insertInto('schedule_task')
      .values({
        id,
        name: draft.name,
        description: draft.description ?? null,
        enabled: draft.enabled,
        datasource_id: draft.dataSourceId,
        sql: draft.sql,
        trigger: draft.trigger,
        last_run_at: null,
        next_run_at: null,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          name: draft.name,
          description: draft.description ?? null,
          enabled: draft.enabled,
          datasource_id: draft.dataSourceId,
          sql: draft.sql,
          trigger: draft.trigger,
          updated_at: now,
        }),
      )
      .execute()

    const saved = await this.get(id)
    if (!saved) {
      throw new Error(`[scheduled-task] save 后未找到任务 ${id}`)
    }
    return saved
  }

  async remove(taskId: string): Promise<boolean> {
    const existing = await this.get(taskId)
    if (!existing) return false

    await this.db
      .updateTable('schedule_task')
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where('id', '=', taskId)
      .execute()
    return true
  }

  async listLogs(taskId: string, page: number, pageSize: number): Promise<{ items: TaskRunLog[]; total: number; page: number; pageSize: number }> {
    const total = await this.db
      .selectFrom('schedule_task_log')
      .select(this.db.fn.countAll().as('total'))
      .where('task_id', '=', taskId)
      .executeTakeFirst()
    const totalNumber = Number(total?.total ?? 0)

    const rows = await this.db
      .selectFrom('schedule_task_log')
      .selectAll()
      .where('task_id', '=', taskId)
      .orderBy('started_at', 'desc')
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute()

    return { items: rows.map(rowToLog), total: totalNumber, page, pageSize }
  }

  async run(taskId: string): Promise<TaskRunLog | undefined> {
    const task = await this.get(taskId)
    if (!task) return undefined

    const now = new Date()
    const logId = `${taskId}_run_${now.getTime()}`
    const durationMs = 60 + Math.floor(Math.random() * 200)
    const affectedRows = Math.floor(Math.random() * 50)

    await this.db
      .insertInto('schedule_task_log')
      .values({
        id: logId,
        task_id: taskId,
        started_at: now,
        trigger: 'manual',
        status: 'success',
        duration_ms: durationMs,
        affected_rows: affectedRows,
        error: null,
      })
      .execute()

    await this.db
      .updateTable('schedule_task')
      .set({ last_run_at: now, updated_at: now })
      .where('id', '=', taskId)
      .where('deleted_at', 'is', null)
      .execute()

    return {
      id: logId,
      taskId,
      startedAt: now.toISOString(),
      trigger: 'manual',
      status: 'success',
      durationMs,
      affectedRows,
    }
  }
}