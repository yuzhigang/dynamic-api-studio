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
