import { Navigate } from '@tanstack/react-router'

import { useDataSourceListQuery } from '@/modules/data-source/hooks/use-data-source-query'

export function DataSourceIndexRedirect() {
  const query = useDataSourceListQuery()

  if (query.isLoading) {
    return <p className="p-6 text-sm text-slate-500">加载数据源中…</p>
  }

  const first = query.data?.[0]

  if (!first) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-8 py-10 text-center text-sm text-slate-500">
          暂无数据源，请在左侧点击「新建数据源」。
        </div>
      </div>
    )
  }

  return <Navigate to="/datasources/$dataSourceId" params={{ dataSourceId: first.id }} replace />
}
