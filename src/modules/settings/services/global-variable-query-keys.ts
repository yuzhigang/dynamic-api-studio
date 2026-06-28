export const globalVariableQueryKeys = {
  all: ['global-variable'] as const,
  globalVariables: () => [...globalVariableQueryKeys.all, 'global-variables'] as const,
}
