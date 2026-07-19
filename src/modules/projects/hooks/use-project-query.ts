import { useQuery } from '@tanstack/react-query'

import { getProject, listProjects } from '@/modules/projects/services/project.api'
import { projectQueryKeys } from '@/modules/projects/services/project-query-keys'

export function useProjectListQuery() {
  return useQuery({
    queryKey: projectQueryKeys.projects(),
    queryFn: listProjects,
  })
}

export function useProjectQuery(projectId: string) {
  return useQuery({
    queryKey: projectQueryKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  })
}
