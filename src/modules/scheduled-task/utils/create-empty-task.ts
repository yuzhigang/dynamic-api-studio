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
