import { useMutation, useQueryClient } from '@tanstack/react-query'

import { homeOverviewQueryKeys } from '@/modules/home/services/home-overview-query-keys'
import { saveProject } from '@/modules/projects/services/project.api'
import { projectQueryKeys } from '@/modules/projects/services/project-query-keys'

export function useSaveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveProject,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.projects() })
      queryClient.invalidateQueries({ queryKey: homeOverviewQueryKeys.overview() })
      queryClient.setQueryData(projectQueryKeys.project(project.id), project)
    },
  })
}
