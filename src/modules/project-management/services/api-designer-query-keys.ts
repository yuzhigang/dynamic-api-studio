export const apiDesignerQueryKeys = {
  all: ['api-designer'] as const,
  apiDefinitions: (projectId: string) =>
    [...apiDesignerQueryKeys.all, 'projects', projectId, 'api-definitions'] as const,
  apiDefinition: (projectId: string, apiId: string) =>
    [...apiDesignerQueryKeys.apiDefinitions(projectId), apiId] as const,
}
