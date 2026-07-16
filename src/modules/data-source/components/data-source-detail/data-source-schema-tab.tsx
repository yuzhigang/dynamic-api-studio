import { useDataSourceSchema } from '@/modules/data-source/hooks/use-data-source-schema'
import type {
  DataSourceSchemaColumn,
  DataSourceSchemaForeignKey,
  DataSourceSchemaIndex,
} from '@/shared/contracts/data-source.contract'

type DataSourceSchemaTabProps = {
  dataSourceId: string
}

/** 把 dataType + length/precision/scale 拼成展示标签，如 varchar(64)、decimal(12,2)。 */
function columnTypeLabel(column: DataSourceSchemaColumn): string {
  let label = column.dataType
  if (column.length != null) {
    label += `(${column.length})`
  } else if (column.precision != null && column.scale != null) {
    label += `(${column.precision},${column.scale})`
  } else if (column.precision != null) {
    label += `(${column.precision})`
  }
  return label
}

function ForeignKeyList({ foreignKeys }: { foreignKeys: DataSourceSchemaForeignKey[] }) {
  return (
    <div className="border-t border-slate-100 px-3 py-2">
      <div className="mb-1 text-xs font-medium text-slate-500">外键</div>
      <ul className="space-y-1 text-xs text-slate-600">
        {foreignKeys.map((fk) => (
          <li key={fk.name} className="font-mono">
            {fk.name}: {fk.columns.join(', ')} → {fk.refSchema ? `${fk.refSchema}.` : ''}
            {fk.refTable}({fk.refColumns.join(', ')})
            {fk.onDelete ? <span className="ml-1 text-slate-400">ON DELETE {fk.onDelete}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function IndexList({ indexes }: { indexes: DataSourceSchemaIndex[] }) {
  return (
    <div className="border-t border-slate-100 px-3 py-2">
      <div className="mb-1 text-xs font-medium text-slate-500">索引</div>
      <ul className="space-y-1 text-xs text-slate-600">
        {indexes.map((index) => (
          <li key={index.name} className="font-mono">
            {index.name}: {index.columns.join(', ')}
            {index.primary ? <span className="ml-1 text-slate-400">主键</span> : index.unique ? <span className="ml-1 text-slate-400">唯一</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DataSourceSchemaTab({ dataSourceId }: DataSourceSchemaTabProps) {
  const query = useDataSourceSchema(dataSourceId)

  if (query.isLoading) {
    return <p className="text-sm text-slate-500">加载 schema 中…</p>
  }

  const tables = query.data?.tables ?? []

  if (tables.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        暂无 schema。schema 需在连接成功后同步。
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      {tables.map((table) => (
        <div key={table.name} className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
            {table.name}
            <span className="ml-2 text-xs font-normal text-slate-500">{table.columns.length} 字段</span>
            {table.comment ? <span className="ml-2 text-xs font-normal text-slate-400">{table.comment}</span> : null}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-3 py-1.5 font-medium">字段</th>
                <th className="px-3 py-1.5 font-medium">类型</th>
                <th className="px-3 py-1.5 font-medium">可空</th>
                <th className="px-3 py-1.5 font-medium">主键</th>
                <th className="px-3 py-1.5 font-medium">默认值</th>
                <th className="px-3 py-1.5 font-medium">注释</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((column) => (
                <tr key={column.name} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-1.5 font-mono text-xs text-slate-800">{column.name}</td>
                  <td className="px-3 py-1.5 text-slate-600">{columnTypeLabel(column)}</td>
                  <td className="px-3 py-1.5 text-slate-500">{column.nullable ? '是' : '否'}</td>
                  <td className="px-3 py-1.5 text-slate-500">{column.isPrimaryKey ? '是' : '否'}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-slate-500">{column.defaultValue ?? '—'}</td>
                  <td className="px-3 py-1.5 text-slate-500">{column.comment ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {table.foreignKeys && table.foreignKeys.length > 0 ? <ForeignKeyList foreignKeys={table.foreignKeys} /> : null}
          {table.indexes && table.indexes.length > 0 ? <IndexList indexes={table.indexes} /> : null}
        </div>
      ))}
    </div>
  )
}