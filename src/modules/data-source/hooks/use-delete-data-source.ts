import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteDataSource } from '@/modules/data-source/services/data-source.api'
import { dataSourceQueryKeys } from '@/modules/data-source/services/data-source-query-keys'

export function useDeleteDataSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDataSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataSourceQueryKeys.dataSources() })
    },
  })
}
