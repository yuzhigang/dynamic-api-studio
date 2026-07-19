import { Badge } from '@/components/ui/badge'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'

export function RequestInfoSummary() {
  const { state } = useApiDesigner()
  const api = state.apiDefinition

  return (
    <section className="space-y-2 text-xs">
      <h3 className="text-sm font-semibold text-slate-900">请求信息</h3>
      <div className="grid gap-1 text-slate-600">
        <div>
          请求方式：<Badge variant="secondary">{api.method}</Badge>
        </div>
        <div>请求路径：{api.path}</div>
      </div>
    </section>
  )
}
