import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteProjectDbSchema,
  getProjectDbSchemaSourceObjects,
  listProjectDbSchemas,
  syncProjectDbSchemaFromSource,
} from '@/modules/projects/services/project-db-schema.api'
import { projectDbSchemaQueryKeys } from '@/modules/projects/services/project-db-schema-query-keys'

export function useProjectDbSchemaListQuery(projectId: string) {
  return useQuery({
    queryKey: projectDbSchemaQueryKeys.list(projectId),
    queryFn: () => listProjectDbSchemas(projectId),
  })
}

export function useProjectDbSchemaSourceObjectsQuery(projectId: string) {
  return useQuery({
    queryKey: projectDbSchemaQueryKeys.sourceObjects(projectId),
    queryFn: () => getProjectDbSchemaSourceObjects(projectId),
  })
}

export function useSyncProjectDbSchemaMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncProjectDbSchemaFromSource.bind(null, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDbSchemaQueryKeys.list(projectId) })
      queryClient.invalidateQueries({
        queryKey: projectDbSchemaQueryKeys.sourceObjects(projectId),
      })
    },
  })
}

export function useDeleteProjectDbSchemaMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ dbSchemaId }: { dbSchemaId: string }) => deleteProjectDbSchema(projectId, dbSchemaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDbSchemaQueryKeys.list(projectId) })
    },
  })
}
