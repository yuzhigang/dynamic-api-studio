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
