import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { InvocationLogPagination } from '@/modules/home/components/invocation-log-pagination'
import { useInvocationLogsQuery } from '@/modules/home/hooks/use-invocation-logs-query'
import { InvocationLogTable } from '@/modules/invocation-log'

export function InvocationLogSection() {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const query = useInvocationLogsQuery(page, pageSize)

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">调用日志</h2>
        <p className="text-sm text-slate-500">最近 API 调用记录。</p>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        {query.error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-slate-500">
            <p>加载调用日志失败</p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>重试</Button>
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
    </section>
  )
}
