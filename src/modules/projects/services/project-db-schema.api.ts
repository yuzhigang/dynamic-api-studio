import { apiFetch } from '@/lib/api-fetch'
import type {
  ProjectDbSchema,
  ProjectDbSchemaDraft,
  SyncProjectDbSchemaFromSource,
} from '@/shared/contracts/project-db-schema.contract'
import type { DataSourceSchema } from '@/shared/contracts/data-source.contract'

export function listProjectDbSchemas(projectId: string) {
  return apiFetch<ProjectDbSchema[]>(`/api/projects/${projectId}/db-schema`)
}

export function getProjectDbSchema(projectId: string, dbSchemaId: string) {
  return apiFetch<ProjectDbSchema>(`/api/projects/${projectId}/db-schema/${dbSchemaId}`)
}

export function saveProjectDbSchema(projectId: string, draft: ProjectDbSchemaDraft) {
  const url = draft.id
    ? `/api/projects/${projectId}/db-schema/${draft.id}`
    : `/api/projects/${projectId}/db-schema`
  return apiFetch<ProjectDbSchema>(url, {
    method: draft.id ? 'PUT' : 'POST',
    body: JSON.stringify(draft),
  })
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
