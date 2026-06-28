import { useQuery } from '@tanstack/react-query'

import { listGlobalVariables } from '@/modules/settings/services/global-variable.api'
import { globalVariableQueryKeys } from '@/modules/settings/services/global-variable-query-keys'

export function useGlobalVariablesQuery() {
  return useQuery({
    queryKey: globalVariableQueryKeys.globalVariables(),
    queryFn: listGlobalVariables,
  })
}
