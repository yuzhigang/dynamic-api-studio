import { readStorage, writeStorage } from '@/lib/storage'
import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

const storageKey = (projectId: string) => `das:project:${projectId}:api-draft`

const isDraftApiId = (id?: string) => Boolean(id && id.startsWith('draft_'))

export function readApiDraft(projectId: string): ApiDefinitionDraft | null {
  if (!projectId) return null
  const stored = readStorage<ApiDefinitionDraft | null>(storageKey(projectId), null)
  return stored && isDraftApiId(stored.id ?? '') ? stored : null
}

export function writeApiDraft(projectId: string, draft: ApiDefinitionDraft) {
  if (!projectId || !isDraftApiId(draft.id ?? '')) return
  writeStorage(storageKey(projectId), draft)
}

export function clearApiDraft(projectId: string) {
  if (!projectId) return
  window.localStorage.removeItem(storageKey(projectId))
}
