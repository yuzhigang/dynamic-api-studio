import { useQuery } from '@tanstack/react-query'

import { getDatasourceMetadata } from '@/modules/data-source/services/metadata.api'
import { metadataQueryKeys } from '@/modules/data-source/services/metadata-query-keys'

export function useDatasourceMetadata(datasourceId: string) {
  return useQuery({
    queryKey: metadataQueryKeys.datasourceMetadata(datasourceId),
    queryFn: () => getDatasourceMetadata(datasourceId),
    enabled: Boolean(datasourceId),
  })
}
