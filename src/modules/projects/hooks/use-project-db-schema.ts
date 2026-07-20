import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteProjectDbSchema,
  getProjectDbSchema,
  getProjectDbSchemaSourceObjects,
  listProjectDbSchemas,
  saveProjectDbSchema,
  syncProjectDbSchemaFromSource,
} from '@/modules/projects/services/project-db-schema.api'
import { projectDbSchemaQueryKeys } from '@/modules/projects/services/project-db-schema-query-keys'
import type { ProjectDbSchemaDraft } from '@/shared/contracts/project-db-schema.contract'

export function useProjectDbSchemaListQuery(projectId: string) {
  return useQuery({
    queryKey: projectDbSchemaQueryKeys.list(projectId),
    queryFn: () => listProjectDbSchemas(projectId),
  })
}

export function useProjectDbSchemaQuery(projectId: string, dbSchemaId: string | undefined) {
  return useQuery({
    queryKey: [...projectDbSchemaQueryKeys.list(projectId), dbSchemaId],
    queryFn: () => getProjectDbSchema(projectId, dbSchemaId!),
    enabled: Boolean(dbSchemaId),
  })
}

export function useProjectDbSchemaSourceObjectsQuery(projectId: string) {
  return useQuery({
    queryKey: projectDbSchemaQueryKeys.sourceObjects(projectId),
    queryFn: () => getProjectDbSchemaSourceObjects(projectId),
  })
}

export function useSaveProjectDbSchemaMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (draft: ProjectDbSchemaDraft) => saveProjectDbSchema(projectId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDbSchemaQueryKeys.list(projectId) })
      queryClient.invalidateQueries({
        queryKey: projectDbSchemaQueryKeys.sourceObjects(projectId),
      })
    },
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
