import { apiFetch } from '@/lib/api-fetch'
import type {
  CustomFunction,
  CustomFunctionDraft,
} from '@/shared/contracts/custom-function.contract'

export function listProjectCustomFunctions(projectId: string) {
  return apiFetch<CustomFunction[]>(`/api/projects/${projectId}/custom-functions`)
}

export function saveProjectCustomFunction(projectId: string, draft: CustomFunctionDraft) {
  const url = draft.id
    ? `/api/projects/${projectId}/custom-functions/${draft.id}`
    : `/api/projects/${projectId}/custom-functions`
  return apiFetch<CustomFunction>(url, {
    method: draft.id ? 'PUT' : 'POST',
    body: JSON.stringify(draft),
  })
}

export function deleteProjectCustomFunction(projectId: string, functionId: string) {
  return apiFetch<{ success: boolean }>(`/api/projects/${projectId}/custom-functions/${functionId}`, {
    method: 'DELETE',
  })
}
