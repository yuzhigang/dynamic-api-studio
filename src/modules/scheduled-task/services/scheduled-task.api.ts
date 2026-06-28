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
