import { apiFetch } from '@/lib/api-fetch'
import type { Project } from '@/shared/contracts/project.contract'

export type HomeOverview = {
  metrics: {
    projectCount: number
    apiCount: number
    datasourceCount: number
    invocationCount: number
  }
  recentProjects: Project[]
}

export function getHomeOverview() {
  return apiFetch<HomeOverview>('/api/home/overview')
}
