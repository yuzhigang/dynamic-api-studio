import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'
import type { WorkflowSymbols } from '@/server/workflow/plan-cache'

/** Build the symbol table (names + defaults) the analyzer needs for one API run. */
export function buildWorkflowSymbols(api: ApiDefinitionDraft, globalNames: string[]): WorkflowSymbols {
  return {
    inputNames: api.requestParams.map((p) => p.name),
    globalNames,
    localNames: [...api.localVariables.map((v) => v.name), ...api.workflowSteps.map((s) => s.outputVariable)],
    defaults: Object.fromEntries(
      api.localVariables
        .filter((v) => v.mode === 'defaulted' && v.defaultValue !== undefined)
        .map((v) => [v.name, v.defaultValue]),
    ),
  }
}