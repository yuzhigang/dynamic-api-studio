export const projectVariableQueryKeys = {
  all: ['project-variable'] as const,
  projectVariables: (projectId: string) =>
    [...projectVariableQueryKeys.all, projectId] as const,
}
