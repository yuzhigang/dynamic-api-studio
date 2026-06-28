import { apiFetch } from '@/lib/api-fetch'
import type {
  ApiDefinitionDraft,
  ApiDefinitionSummary,
} from '@/shared/contracts/api-definition.contract'

export async function listApiDefinitions(projectId: string) {
  return apiFetch<ApiDefinitionSummary[]>(`/api/projects/${projectId}/apis`)
}

export async function getApiDefinition(projectId: string, apiId: string) {
  return apiFetch<ApiDefinitionDraft>(`/api/projects/${projectId}/apis/${apiId}`)
}

export async function saveApiDefinition(projectId: string, apiDefinition: ApiDefinitionDraft) {
  const apiId = apiDefinition.id

  return apiFetch<{ id: string; status: 'draft' | 'published' }>(
    apiId ? `/api/projects/${projectId}/apis/${apiId}` : `/api/projects/${projectId}/apis`,
    {
      method: apiId ? 'PUT' : 'POST',
      body: JSON.stringify(apiDefinition),
    },
  )
}
