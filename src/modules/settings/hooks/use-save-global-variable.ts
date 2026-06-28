import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveGlobalVariable } from '@/modules/settings/services/global-variable.api'
import { globalVariableQueryKeys } from '@/modules/settings/services/global-variable-query-keys'

export function useSaveGlobalVariable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveGlobalVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalVariableQueryKeys.globalVariables() })
    },
  })
}
