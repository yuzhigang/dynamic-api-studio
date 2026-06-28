import { useNavigate } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataSourceListItem } from '@/modules/data-source/components/data-source-list/data-source-list-item'
import { useSaveDataSource } from '@/modules/data-source/hooks/use-save-data-source'
import { createEmptyDataSourceDraft } from '@/modules/data-source/utils/data-source-draft'
import type { DataSource } from '@/shared/contracts/data-source.contract'

type DataSourceSidebarProps = {
  dataSources: DataSource[]
  selectedId?: string
  loading?: boolean
}

export function DataSourceSidebar({ dataSources, selectedId, loading }: DataSourceSidebarProps) {
  const navigate = useNavigate()
  const saveDataSource = useSaveDataSource()
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    const value = keyword.trim().toLowerCase()

    if (!value) {
      return dataSources
    }

    return dataSources.filter((dataSource) =>
      [dataSource.name, dataSource.host, dataSource.database].some((field) =>
        field.toLowerCase().includes(value),
      ),
    )
  }, [dataSources, keyword])

  const handleCreate = () => {
    saveDataSource.mutate(createEmptyDataSourceDraft(), {
      onSuccess: (created) => {
        navigate({ to: '/datasources/$dataSourceId', params: { dataSourceId: created.id } })
      },
    })
  }

  return (
    <aside className="flex min-h-0 w-[clamp(260px,24vw,320px)] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="space-y-3 border-b border-slate-200 p-3">
        <Button className="w-full" onClick={handleCreate} disabled={saveDataSource.isPending}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          新建数据源
        </Button>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索数据源名称或地址…"
            className="pl-9"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
        {loading ? <p className="px-2 py-3 text-sm text-slate-500">加载数据源中…</p> : null}
        {!loading && filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-500">
            {dataSources.length === 0 ? '暂无数据源，点击上方新建。' : '没有匹配的数据源。'}
          </p>
        ) : null}
        {filtered.map((dataSource) => (
          <DataSourceListItem
            key={dataSource.id}
            dataSource={dataSource}
            active={dataSource.id === selectedId}
          />
        ))}
      </div>
    </aside>
  )
}
