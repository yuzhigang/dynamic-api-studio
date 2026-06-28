import { useQuery } from '@tanstack/react-query'

import { apiDesignerQueryKeys } from '@/modules/project-management/services/api-designer-query-keys'
import {
  getApiDefinition,
  listApiDefinitions,
} from '@/modules/project-management/services/api-definition.api'

export function useApiDefinitionListQuery(projectId: string) {
  return useQuery({
    queryKey: apiDesignerQueryKeys.apiDefinitions(projectId),
    queryFn: () => listApiDefinitions(projectId),
    enabled: Boolean(projectId),
  })
}

export function useApiDefinitionQuery(projectId: string, apiId: string) {
  return useQuery({
    queryKey: apiDesignerQueryKeys.apiDefinition(projectId, apiId),
    queryFn: () => getApiDefinition(projectId, apiId),
    enabled: Boolean(projectId && apiId),
  })
}
