import type { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import type { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'

type ScopedVariable = { name: string; kind: 'single' | 'list'; value: string; items: unknown[] }

export type GlobalVariableLoaderServices = {
  globalVariableService: GlobalVariableService
  projectVariableService: ProjectVariableService
}

/** Load platform globals + project variables into a flat record; project overrides platform on name collision. */
export function loadGlobalValues(projectId: string, services: GlobalVariableLoaderServices): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const variable of services.globalVariableService.list() as ScopedVariable[]) {
    result[variable.name] = variableValue(variable)
  }
  for (const variable of services.projectVariableService.list(projectId) as ScopedVariable[]) {
    result[variable.name] = variableValue(variable)
  }

  return result
}

function variableValue(variable: ScopedVariable): unknown {
  return variable.kind === 'list' ? variable.items : variable.value
}