import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { generateDbMigration, listDbMigrations } from '@/modules/projects/services/db-migration.api'
import { dbMigrationQueryKeys } from '@/modules/projects/services/db-migration-query-keys'
import type { GenerateMigrationRequest } from '@/shared/contracts/db-migration.contract'

export function useDbMigrationListQuery(projectId: string) {
  return useQuery({
    queryKey: dbMigrationQueryKeys.list(projectId),
    queryFn: () => listDbMigrations(projectId),
  })
}

export function useGenerateDbMigrationMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: GenerateMigrationRequest = {}) => generateDbMigration(projectId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbMigrationQueryKeys.list(projectId) })
    },
  })
}
