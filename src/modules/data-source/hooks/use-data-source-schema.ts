import { useQuery } from '@tanstack/react-query'

import { getDataSourceSchema } from '@/modules/data-source/services/schema.api'
import { schemaQueryKeys } from '@/modules/data-source/services/schema-query-keys'

export function useDataSourceSchema(datasourceId: string) {
  return useQuery({
    queryKey: schemaQueryKeys.schema(datasourceId),
    queryFn: () => getDataSourceSchema(datasourceId),
    enabled: Boolean(datasourceId),
  })
}