import { cn } from '@/lib/cn'
import type { HttpMethod } from '@/shared/enums/http-method'
import type { ApiDefinitionSummary } from '@/shared/contracts/api-definition.contract'

type ProjectApiListCardProps = {
  api: ApiDefinitionSummary
  active: boolean
  onSelect: () => void
}

const methodColor: Record<HttpMethod, string> = {
  GET: 'text-emerald-600',
  POST: 'text-blue-600',
  PUT: 'text-amber-600',
  PATCH: 'text-violet-600',
  DELETE: 'text-red-600',
}

export function ProjectApiListCard({ api, active, onSelect }: ProjectApiListCardProps) {
  const published = api.status === 'published'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'block w-full rounded-md border px-2.5 py-1.5 text-left transition-colors',
        active
          ? 'border-slate-300 bg-white shadow-sm'
          : 'border-transparent hover:border-slate-200 hover:bg-white/60',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn('w-10 shrink-0 font-mono text-[10px] font-bold', methodColor[api.method])}>
          {api.method}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{api.name}</span>
        <span
          aria-hidden="true"
          title={published ? '已发布' : '草稿'}
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', published ? 'bg-emerald-500' : 'bg-slate-300')}
        />
      </div>
      <p className="truncate pl-[46px] font-mono text-xs text-slate-500">{api.path}</p>
    </button>
  )
}
