import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteGlobalVariable } from '@/modules/settings/services/global-variable.api'
import { globalVariableQueryKeys } from '@/modules/settings/services/global-variable-query-keys'

export function useDeleteGlobalVariable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteGlobalVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalVariableQueryKeys.globalVariables() })
    },
  })
}
