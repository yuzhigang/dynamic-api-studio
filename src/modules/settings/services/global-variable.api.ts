import { apiFetch } from '@/lib/api-fetch'
import type {
  GlobalVariable,
  GlobalVariableDraft,
} from '@/shared/contracts/global-variable.contract'

export function listGlobalVariables() {
  return apiFetch<GlobalVariable[]>('/api/global-variables')
}

export function saveGlobalVariable(draft: GlobalVariableDraft) {
  return apiFetch<GlobalVariable>(
    draft.id ? `/api/global-variables/${draft.id}` : '/api/global-variables',
    {
      method: draft.id ? 'PUT' : 'POST',
      body: JSON.stringify(draft),
    },
  )
}

export function deleteGlobalVariable(variableId: string) {
  return apiFetch<{ success: boolean }>(`/api/global-variables/${variableId}`, {
    method: 'DELETE',
  })
}
