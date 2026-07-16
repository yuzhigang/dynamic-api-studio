export const schemaQueryKeys = {
  all: ['data-source-schema'] as const,
  schema: (datasourceId: string) => [...schemaQueryKeys.all, datasourceId] as const,
}