import { Outlet, useParams } from '@tanstack/react-router'

import { DataSourceSidebar } from '@/modules/data-source/components/data-source-list/data-source-sidebar'
import { useDataSourceListQuery } from '@/modules/data-source/hooks/use-data-source-query'

export function DataSourcePage() {
  const query = useDataSourceListQuery()
  const { dataSourceId } = useParams({ strict: false }) as { dataSourceId?: string }

  return (
    <div className="flex h-full min-h-0">
      <DataSourceSidebar
        dataSources={query.data ?? []}
        selectedId={dataSourceId}
        loading={query.isLoading}
      />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
