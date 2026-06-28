import { useQuery } from '@tanstack/react-query'

import {
  getDataSource,
  listDataSources,
} from '@/modules/data-source/services/data-source.api'
import { dataSourceQueryKeys } from '@/modules/data-source/services/data-source-query-keys'

export function useDataSourceListQuery() {
  return useQuery({
    queryKey: dataSourceQueryKeys.dataSources(),
    queryFn: listDataSources,
  })
}

export function useDataSourceQuery(dataSourceId: string) {
  return useQuery({
    queryKey: dataSourceQueryKeys.dataSource(dataSourceId),
    queryFn: () => getDataSource(dataSourceId),
    enabled: Boolean(dataSourceId),
  })
}
