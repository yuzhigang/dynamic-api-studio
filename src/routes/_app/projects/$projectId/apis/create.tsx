import { Navigate, useParams } from '@tanstack/react-router'

import { createId } from '@/lib/id'
import { readApiDraft } from '@/modules/projects/utils/api-draft-storage'

export function CreateProjectApiRouteComponent() {
  const { projectId = '' } = useParams({ strict: false }) as { projectId?: string }
  const stored = readApiDraft(projectId)
  const draftApiId = stored?.id ?? createId('draft')

  return (
    <Navigate
      to="/projects/$projectId/apis/$apiId"
      params={{ projectId, apiId: draftApiId }}
      replace
    />
  )
}
