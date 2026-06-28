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
