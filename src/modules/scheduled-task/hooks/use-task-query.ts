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
