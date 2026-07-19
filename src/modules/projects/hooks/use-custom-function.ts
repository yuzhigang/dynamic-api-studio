import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteProjectCustomFunction,
  listProjectCustomFunctions,
  saveProjectCustomFunction,
} from '@/modules/projects/services/custom-function.api'
import { customFunctionQueryKeys } from '@/modules/projects/services/custom-function-query-keys'
import type { CustomFunctionDraft } from '@/shared/contracts/custom-function.contract'

export function useProjectCustomFunctionsQuery(projectId: string) {
  return useQuery({
    queryKey: customFunctionQueryKeys.list(projectId),
    queryFn: () => listProjectCustomFunctions(projectId),
  })
}

export function useSaveProjectCustomFunctionMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (draft: CustomFunctionDraft) => saveProjectCustomFunction(projectId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFunctionQueryKeys.list(projectId) })
    },
  })
}

export function useDeleteProjectCustomFunctionMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (functionId: string) => deleteProjectCustomFunction(projectId, functionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFunctionQueryKeys.list(projectId) })
    },
  })
}
