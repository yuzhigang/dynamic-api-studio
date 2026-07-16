import type { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import type { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'

type ScopedVariable = { name: string; kind: 'single' | 'list'; value: string; items: unknown[] }

export type GlobalVariableLoaderServices = {
  globalVariableService: GlobalVariableService
  projectVariableService: ProjectVariableService
}

/**
 * Load platform globals + project variables into a flat record; project overrides platform on name collision.
 *
 * 变量 repository 已迁 Kysely（list 为异步），故本函数异步；调用方需 await。
 */
export async function loadGlobalValues(
  projectId: string,
  services: GlobalVariableLoaderServices,
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {}

  for (const variable of (await services.globalVariableService.list()) as ScopedVariable[]) {
    result[variable.name] = variableValue(variable)
  }
  for (const variable of (await services.projectVariableService.list(projectId)) as ScopedVariable[]) {
    result[variable.name] = variableValue(variable)
  }

  return result
}

function variableValue(variable: ScopedVariable): unknown {
  return variable.kind === 'list' ? variable.items : variable.value
}