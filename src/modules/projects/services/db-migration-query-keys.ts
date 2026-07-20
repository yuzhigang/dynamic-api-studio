export const dbMigrationQueryKeys = {
  all: ['db-migration'] as const,
  project: (projectId: string) => [...dbMigrationQueryKeys.all, projectId] as const,
  list: (projectId: string) => [...dbMigrationQueryKeys.project(projectId), 'list'] as const,
}
