import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getTaskLogs } from '@/modules/scheduled-task/services/scheduled-task.api'
import { scheduledTaskQueryKeys } from '@/modules/scheduled-task/services/scheduled-task-query-keys'

export function useTaskLogsQuery(taskId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: scheduledTaskQueryKeys.logs(taskId, page, pageSize),
    queryFn: () => getTaskLogs(taskId, page, pageSize),
    enabled: Boolean(taskId),
    placeholderData: keepPreviousData,
  })
}
