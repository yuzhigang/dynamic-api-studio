import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { AppPage } from '@/layouts/app-shell/app-page'
import { InvocationLogPagination } from '@/modules/home/components/invocation-log-pagination'
import { useInvocationLogsQuery } from '@/modules/home/hooks/use-invocation-logs-query'
import { InvocationLogFilterBar, InvocationLogTable } from '@/modules/invocation-log'
import type { InvocationLogFilters } from '@/modules/invocation-log'

export function InvocationLogPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<InvocationLogFilters>({})
  const pageSize = 10
  const query = useInvocationLogsQuery(page, pageSize, filters)

  const handleFiltersChange = (next: InvocationLogFilters) => {
    setFilters(next)
    setPage(1) // 条件变化后回到第一页
  }

  return (
    <AppPage
      title={
        <div>
          <h1 className="text-base font-semibold text-slate-900">调用日志</h1>
          <p className="text-sm text-slate-500">最近 API 调用记录。</p>
        </div>
      }
    >
      <div className="h-full space-y-4 overflow-auto p-5">
        <InvocationLogFilterBar value={filters} onChange={handleFiltersChange} />

        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          {query.error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-slate-500">
              <p>加载调用日志失败</p>
              <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                重试
              </Button>
            </div>
          ) : (
            <>
              <InvocationLogTable
                logs={query.data?.items}
                loading={query.isLoading}
                showApiName
              />
              {query.data && query.data.total > query.data.pageSize && (
                <InvocationLogPagination
                  page={query.data.page}
                  pageSize={query.data.pageSize}
                  total={query.data.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </AppPage>
  )
}
