export const customFunctionQueryKeys = {
  all: ['custom-function'] as const,
  project: (projectId: string) => [...customFunctionQueryKeys.all, projectId] as const,
  list: (projectId: string) => [...customFunctionQueryKeys.project(projectId), 'list'] as const,
}
