import { apiFetch } from '@/lib/api-fetch'
import type {
  GenerateCrudOptions,
  GenerateCrudResult,
} from '@/shared/contracts/crud-generation.contract'

export function generateCrud(projectId: string, dbSchemaId: string, options: GenerateCrudOptions = {}) {
  return apiFetch<GenerateCrudResult>(`/api/projects/${projectId}/db-schema/${dbSchemaId}/generate-crud`, {
    method: 'POST',
    body: JSON.stringify(options),
  })
}
