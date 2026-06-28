import { apiFetch } from '@/lib/api-fetch'
import type { Project, ProjectDraft } from '@/shared/contracts/project.contract'

export function listProjects() {
  return apiFetch<Project[]>('/api/projects')
}

export function getProject(projectId: string) {
  return apiFetch<Project>(`/api/projects/${projectId}`)
}

export function saveProject(project: ProjectDraft) {
  return apiFetch<Project>(project.id ? `/api/projects/${project.id}` : '/api/projects', {
    method: project.id ? 'PUT' : 'POST',
    body: JSON.stringify(project),
  })
}

export function archiveProject(projectId: string) {
  return apiFetch<Project>(`/api/projects/${projectId}/archive`, {
    method: 'POST',
  })
}

export function copyProject(projectId: string) {
  return apiFetch<Project>(`/api/projects/${projectId}/copy`, {
    method: 'POST',
  })
}
