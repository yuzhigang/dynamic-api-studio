import type { InvocationLogFilters } from '@/modules/invocation-log'

export const invocationLogQueryKeys = {
  all: ['invocation-log'] as const,
  list: (page: number, pageSize: number, filters: InvocationLogFilters = {}) =>
    [...invocationLogQueryKeys.all, 'list', { page, pageSize, filters }] as const,
}
