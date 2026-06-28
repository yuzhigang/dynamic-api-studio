import { useQuery } from '@tanstack/react-query'

import { listDataSources } from '@/modules/scheduled-task/services/scheduled-task.api'
import { scheduledTaskQueryKeys } from '@/modules/scheduled-task/services/scheduled-task-query-keys'

export function useDataSourcesQuery() {
  return useQuery({
    queryKey: scheduledTaskQueryKeys.dataSources(),
    queryFn: listDataSources,
    staleTime: Infinity,
  })
}
