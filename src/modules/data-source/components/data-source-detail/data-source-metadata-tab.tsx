import { useDatasourceMetadata } from '@/modules/data-source/hooks/use-datasource-metadata'

type DataSourceMetadataTabProps = {
  dataSourceId: string
}

export function DataSourceMetadataTab({ dataSourceId }: DataSourceMetadataTabProps) {
  const query = useDatasourceMetadata(dataSourceId)

  if (query.isLoading) {
    return <p className="text-sm text-slate-500">加载元数据中…</p>
  }

  const tables = query.data?.tables ?? []

  if (tables.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        暂无元数据。元数据需在连接成功后同步。
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      {tables.map((table) => (
        <div key={table.name} className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
            {table.name}
            <span className="ml-2 text-xs font-normal text-slate-500">
              {table.columns.length} 字段
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-3 py-1.5 font-medium">字段</th>
                <th className="px-3 py-1.5 font-medium">类型</th>
                <th className="px-3 py-1.5 font-medium">注释</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((column) => (
                <tr key={column.name} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-1.5 font-mono text-xs text-slate-800">{column.name}</td>
                  <td className="px-3 py-1.5 text-slate-600">{column.type}</td>
                  <td className="px-3 py-1.5 text-slate-500">{column.comment ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
