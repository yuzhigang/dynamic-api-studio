import { apiFetch } from '@/lib/api-fetch'
import type {
  ProjectVariable,
  ProjectVariableDraft,
} from '@/shared/contracts/project-variable.contract'

export function listProjectVariables(projectId: string) {
  return apiFetch<ProjectVariable[]>(`/api/projects/${projectId}/variables`)
}

export function saveProjectVariable(projectId: string, draft: ProjectVariableDraft) {
  return apiFetch<ProjectVariable>(
    draft.id
      ? `/api/projects/${projectId}/variables/${draft.id}`
      : `/api/projects/${projectId}/variables`,
    {
      method: draft.id ? 'PUT' : 'POST',
      body: JSON.stringify(draft),
    },
  )
}

export function deleteProjectVariable(projectId: string, variableId: string) {
  return apiFetch<{ success: boolean }>(
    `/api/projects/${projectId}/variables/${variableId}`,
    { method: 'DELETE' },
  )
}
