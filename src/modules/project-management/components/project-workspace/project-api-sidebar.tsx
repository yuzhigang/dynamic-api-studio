import { Link } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { ProjectApiListCard } from '@/modules/project-management/components/project-workspace/project-api-list-card'
import { paginate } from '@/modules/project-management/components/project-workspace/history-utils'
import type { ApiDefinitionSummary } from '@/shared/contracts/api-definition.contract'

const pageSize = 6

type ProjectApiSidebarProps = {
  projectId: string
  apis: ApiDefinitionSummary[]
  selectedApiId?: string
  archived?: boolean
  loading?: boolean
  onSelectApi: (apiId: string) => void
}

export function ProjectApiSidebar({
  projectId,
  apis,
  selectedApiId,
  archived,
  loading,
  onSelectApi,
}: ProjectApiSidebarProps) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const filteredApis = useMemo(() => {
    const value = keyword.trim().toLowerCase()

    if (!value) {
      return apis
    }

    return apis.filter((api) =>
      [api.name, api.path, api.method].some((field) => field.toLowerCase().includes(value)),
    )
  }, [apis, keyword])
  const pagedApis = useMemo(() => paginate(filteredApis, page, pageSize), [filteredApis, page])

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    setPage(1)
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-slate-200 bg-slate-50">
      <div className="space-y-3 border-b border-slate-200 p-3">
        {archived ? (
          <Button className="w-full justify-start" disabled>
            <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
            添加 API
          </Button>
        ) : (
          <Button asChild className="w-full justify-start">
            <Link to="/projects/$projectId/apis/create" params={{ projectId }}>
              <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
              添加 API
            </Link>
          </Button>
        )}
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={keyword}
            onChange={(event) => handleKeywordChange(event.target.value)}
            placeholder="搜索 API 名称或路径…"
            aria-label="搜索 API 名称或路径"
            name="api-search"
            autoComplete="off"
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-auto p-2">
        {loading ? (
          <Card className="bg-white">
            <CardContent className="p-4 text-sm text-slate-500">加载 API 中…</CardContent>
          </Card>
        ) : null}
        {!loading && pagedApis.items.length ? (
          pagedApis.items.map((api) => (
            <ProjectApiListCard
              key={api.id}
              api={api}
              active={api.id === selectedApiId}
              onSelect={() => onSelectApi(api.id)}
            />
          ))
        ) : null}
        {!loading && !filteredApis.length ? (
          <Card className="bg-white">
            <CardContent className="p-4 text-sm text-slate-500">暂无匹配 API</CardContent>
          </Card>
        ) : null}
      </div>

      {!loading && filteredApis.length > pageSize ? (
        <Pagination
          page={pagedApis.page}
          pageSize={pageSize}
          total={filteredApis.length}
          onPageChange={setPage}
          showInfo={false}
          className="h-12 shrink-0 justify-center border-t border-slate-200 bg-white px-3"
        />
      ) : null}
    </aside>
  )
}
