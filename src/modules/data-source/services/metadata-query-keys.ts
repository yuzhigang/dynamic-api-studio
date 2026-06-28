export const metadataQueryKeys = {
  all: ['datasource-metadata'] as const,
  datasourceMetadata: (datasourceId: string) =>
    [...metadataQueryKeys.all, datasourceId] as const,
}
