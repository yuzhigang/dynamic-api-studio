import { apiFetch } from '@/lib/api-fetch'
import type { ProjectDbSchema, SyncProjectDbSchemaFromSource } from '@/shared/contracts/project-db-schema.contract'
import type { DataSourceSchema } from '@/shared/contracts/data-source.contract'

export function listProjectDbSchemas(projectId: string) {
  return apiFetch<ProjectDbSchema[]>(`/api/projects/${projectId}/db-schema`)
}

export function getProjectDbSchemaSourceObjects(projectId: string) {
  return apiFetch<{
    available: boolean
    reason?: string
    dbSourceId?: string
    objects: DataSourceSchema['tables']
  }>(`/api/projects/${projectId}/db-schema/source-objects`)
}

export function syncProjectDbSchemaFromSource(
  projectId: string,
  payload: SyncProjectDbSchemaFromSource,
) {
  return apiFetch<ProjectDbSchema[]>(`/api/projects/${projectId}/db-schema/sync-from-source`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteProjectDbSchema(projectId: string, dbSchemaId: string) {
  return apiFetch<{ success: boolean }>(`/api/projects/${projectId}/db-schema/${dbSchemaId}`, {
    method: 'DELETE',
  })
}
