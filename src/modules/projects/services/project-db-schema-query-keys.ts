export const projectDbSchemaQueryKeys = {
  all: ['project-db-schema'] as const,
  project: (projectId: string) => [...projectDbSchemaQueryKeys.all, projectId] as const,
  list: (projectId: string) => [...projectDbSchemaQueryKeys.project(projectId), 'list'] as const,
  sourceObjects: (projectId: string) => [...projectDbSchemaQueryKeys.project(projectId), 'source-objects'] as const,
}
