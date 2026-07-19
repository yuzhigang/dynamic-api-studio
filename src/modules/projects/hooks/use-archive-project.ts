import { useMutation, useQueryClient } from '@tanstack/react-query'

import { homeOverviewQueryKeys } from '@/modules/home/services/home-overview-query-keys'
import { archiveProject } from '@/modules/projects/services/project.api'
import { projectQueryKeys } from '@/modules/projects/services/project-query-keys'

export function useArchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: archiveProject,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.projects() })
      queryClient.invalidateQueries({ queryKey: homeOverviewQueryKeys.overview() })
      queryClient.setQueryData(projectQueryKeys.project(project.id), project)
    },
  })
}
