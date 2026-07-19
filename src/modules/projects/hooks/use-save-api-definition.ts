import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveApiDefinition } from '@/modules/projects/services/api-definition.api'
import { apiDesignerQueryKeys } from '@/modules/projects/services/api-designer-query-keys'
import { normalizeApiDefinition } from '@/modules/projects/utils/normalize-api-definition'
import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

export function useSaveApiDefinition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (apiDefinition: ApiDefinitionDraft) => {
      const normalized = normalizeApiDefinition(apiDefinition)
      return saveApiDefinition(normalized.projectId, normalized)
    },
    onSuccess: (_, apiDefinition) => {
      queryClient.invalidateQueries({
        queryKey: apiDesignerQueryKeys.apiDefinitions(apiDefinition.projectId),
      })
    },
  })
}
