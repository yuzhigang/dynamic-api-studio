import { apiFetch } from '@/lib/api-fetch'
import type { DbMigration, GenerateMigrationRequest } from '@/shared/contracts/db-migration.contract'

export function listDbMigrations(projectId: string) {
  return apiFetch<DbMigration[]>(`/api/projects/${projectId}/db-migrations`)
}

export function generateDbMigration(projectId: string, request: GenerateMigrationRequest = {}) {
  return apiFetch<DbMigration>(`/api/projects/${projectId}/db-migrations/generate`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
