import { useMutation, useQueryClient } from '@tanstack/react-query'

import { generateCrud } from '@/modules/projects/services/crud-generation.api'
import { apiDesignerQueryKeys } from '@/modules/projects/services/api-designer-query-keys'
import { projectDbSchemaQueryKeys } from '@/modules/projects/services/project-db-schema-query-keys'

export function useGenerateCrudMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ dbSchemaId, options }: { dbSchemaId: string; options?: { status?: 'draft' | 'published' } }) =>
      generateCrud(projectId, dbSchemaId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDesignerQueryKeys.apiDefinitions(projectId) })
      queryClient.invalidateQueries({ queryKey: projectDbSchemaQueryKeys.list(projectId) })
    },
  })
}
