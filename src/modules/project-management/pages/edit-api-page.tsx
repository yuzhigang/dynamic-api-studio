import { useParams } from '@tanstack/react-router'

import { AppPage } from '@/layouts/app-shell/app-page'
import { ApiDesigner } from '@/modules/project-management/components/designer/api-designer'
import { useApiDefinitionQuery } from '@/modules/project-management/hooks/use-api-definition-query'

export function EditApiPage() {
  const { projectId = '', apiId = '' } = useParams({ strict: false }) as {
    projectId?: string
    apiId?: string
  }
  const query = useApiDefinitionQuery(projectId, apiId)

  if (query.isLoading) {
    return (
      <AppPage>
        <div className="p-5 text-sm text-slate-500">加载中…</div>
      </AppPage>
    )
  }

  if (!query.data) {
    return (
      <AppPage>
        <div className="p-5 text-sm text-slate-500">API 不存在或不属于当前项目。</div>
      </AppPage>
    )
  }

  return <ApiDesigner initialApiDefinition={query.data} />
}
