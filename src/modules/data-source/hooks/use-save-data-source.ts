import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveDataSource } from '@/modules/data-source/services/data-source.api'
import { dataSourceQueryKeys } from '@/modules/data-source/services/data-source-query-keys'

export function useSaveDataSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveDataSource,
    onSuccess: (dataSource) => {
      queryClient.invalidateQueries({ queryKey: dataSourceQueryKeys.dataSources() })
      queryClient.setQueryData(dataSourceQueryKeys.dataSource(dataSource.id), dataSource)
    },
  })
}
