import { apiFetch } from '@/lib/api-fetch'
import type { ApiTestRequest, ApiTestResult } from '@/shared/contracts/api-definition.contract'

export async function runApiDraftTest(projectId: string, request: ApiTestRequest) {
  return apiFetch<ApiTestResult>(`/api/projects/${projectId}/apis/test-draft`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function runApiTest(projectId: string, apiId: string, request: ApiTestRequest) {
  return apiFetch<ApiTestResult>(`/api/projects/${projectId}/apis/${apiId}/test`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
