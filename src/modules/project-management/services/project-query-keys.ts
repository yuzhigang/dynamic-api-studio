export const projectQueryKeys = {
  all: ['project-management'] as const,
  projects: () => [...projectQueryKeys.all, 'projects'] as const,
  project: (projectId: string) => [...projectQueryKeys.projects(), projectId] as const,
}
