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