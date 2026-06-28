import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/cn'
import { DialectBadge } from '@/modules/data-source/components/common/dialect-badge'
import type { DataSource } from '@/shared/contracts/data-source.contract'

type DataSourceListItemProps = {
  dataSource: DataSource
  active: boolean
}

export function DataSourceListItem({ dataSource, active }: DataSourceListItemProps) {
  return (
    <Link
      to="/datasources/$dataSourceId"
      params={{ dataSourceId: dataSource.id }}
      className={cn(
        'block rounded-md border px-3 py-2.5 transition-colors',
        active
          ? 'border-slate-300 bg-white shadow-sm'
          : 'border-transparent hover:border-slate-200 hover:bg-white/60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-900">{dataSource.name}</span>
        <DialectBadge dialect={dataSource.dialect} />
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">
        {dataSource.host ? `${dataSource.host}:${dataSource.port}` : '未配置连接地址'}
      </p>
    </Link>
  )
}
