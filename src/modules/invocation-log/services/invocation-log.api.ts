import { apiFetch } from '@/lib/api-fetch'
import type { InvocationLog, InvocationLogFilters } from '@/modules/invocation-log'

export type InvocationLogsResponse = {
  items: InvocationLog[]
  total: number
  page: number
  pageSize: number
}

export function getInvocationLogs(page = 1, pageSize = 10, filters: InvocationLogFilters = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  for (const [key, raw] of Object.entries(filters)) {
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (value) params.set(key, String(value))
  }
  return apiFetch<InvocationLogsResponse>(`/api/home/invocations?${params.toString()}`)
}
