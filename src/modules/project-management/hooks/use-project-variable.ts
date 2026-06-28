import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteProjectVariable,
  listProjectVariables,
  saveProjectVariable,
} from '@/modules/project-management/services/project-variable.api'
import { projectVariableQueryKeys } from '@/modules/project-management/services/project-variable-query-keys'
import type { ProjectVariableDraft } from '@/shared/contracts/project-variable.contract'

export function useProjectVariablesQuery(projectId: string) {
  return useQuery({
    queryKey: projectVariableQueryKeys.projectVariables(projectId),
    queryFn: () => listProjectVariables(projectId),
    enabled: Boolean(projectId),
  })
}

export function useSaveProjectVariable(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (draft: ProjectVariableDraft) => saveProjectVariable(projectId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectVariableQueryKeys.projectVariables(projectId),
      })
    },
  })
}

export function useDeleteProjectVariable(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variableId: string) => deleteProjectVariable(projectId, variableId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectVariableQueryKeys.projectVariables(projectId),
      })
    },
  })
}
