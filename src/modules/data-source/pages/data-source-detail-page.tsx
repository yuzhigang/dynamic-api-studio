import { Link, useParams } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { DataSourceDetailPanel } from '@/modules/data-source/components/data-source-detail/data-source-detail-panel'
import { useDataSourceQuery } from '@/modules/data-source/hooks/use-data-source-query'

export function DataSourceDetailPage() {
  const { dataSourceId = '' } = useParams({ strict: false }) as { dataSourceId?: string }
  const query = useDataSourceQuery(dataSourceId)
  const dataSource = query.data

  if (query.isLoading) {
    return <p className="p-6 text-sm text-slate-500">加载数据源中…</p>
  }

  if (!dataSource) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-8 py-10 text-center text-sm text-slate-500">
          数据源不存在。
          <Button asChild variant="link" className="ml-1 px-1">
            <Link to="/datasources">返回数据源列表</Link>
          </Button>
        </div>
      </div>
    )
  }

  return <DataSourceDetailPanel dataSource={dataSource} />
}
