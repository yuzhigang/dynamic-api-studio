export const dataSourceQueryKeys = {
  all: ['data-source'] as const,
  dataSources: () => [...dataSourceQueryKeys.all, 'data-sources'] as const,
  dataSource: (dataSourceId: string) =>
    [...dataSourceQueryKeys.dataSources(), dataSourceId] as const,
}
