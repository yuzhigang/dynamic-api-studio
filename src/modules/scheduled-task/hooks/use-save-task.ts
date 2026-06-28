import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveTask } from '@/modules/scheduled-task/services/scheduled-task.api'
import { scheduledTaskQueryKeys } from '@/modules/scheduled-task/services/scheduled-task-query-keys'

export function useSaveTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveTask,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: scheduledTaskQueryKeys.tasks() })
      queryClient.setQueryData(scheduledTaskQueryKeys.task(task.id), task)
    },
  })
}
