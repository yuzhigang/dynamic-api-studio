export const scheduledTaskQueryKeys = {
  all: ['scheduled-task'] as const,
  tasks: () => [...scheduledTaskQueryKeys.all, 'tasks'] as const,
  task: (taskId: string) => [...scheduledTaskQueryKeys.tasks(), taskId] as const,
  logs: (taskId: string, page: number, pageSize: number) =>
    [...scheduledTaskQueryKeys.task(taskId), 'logs', { page, pageSize }] as const,
  dataSources: () => [...scheduledTaskQueryKeys.all, 'data-sources'] as const,
}
