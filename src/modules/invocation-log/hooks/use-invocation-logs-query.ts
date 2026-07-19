import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getInvocationLogs } from '@/modules/invocation-log/services/invocation-log.api'
import { invocationLogQueryKeys } from '@/modules/invocation-log/services/invocation-log-query-keys'
import type { InvocationLogFilters } from '@/modules/invocation-log'

export function useInvocationLogsQuery(
  page = 1,
  pageSize = 10,
  filters: InvocationLogFilters = {},
) {
  return useQuery({
    queryKey: invocationLogQueryKeys.list(page, pageSize, filters),
    queryFn: () => getInvocationLogs(page, pageSize, filters),
    placeholderData: keepPreviousData,
  })
}
