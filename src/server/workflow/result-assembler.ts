import type { ApiDefinitionDraft, SchemaField } from '@/shared/schemas/api-definition.schema'
import type { VariableContext } from '@/server/analyzer/types'

export type ResponseDiagnostic = { field: string; message: string }

export type AssembleResult = { response: unknown; diagnostics: ResponseDiagnostic[] }

/** Locate the assemble step, return its output, validate against responseSchema (v1: validate + passthrough). */
export function assembleResponse(api: ApiDefinitionDraft, context: VariableContext): AssembleResult {
  const assembleSteps = api.workflowSteps.filter((s) => s.role === 'assemble')
  if (assembleSteps.length !== 1) {
    throw new Error(`工作流必须包含且仅包含一个 role="assemble" 步骤，当前为 ${assembleSteps.length} 个`)
  }

  const assembleStep = assembleSteps[0]
  const response = context.get('local', assembleStep.outputVariable)?.value
  const diagnostics = validateResponseShape(response, api.responseSchema as SchemaField[])
  return { response, diagnostics }
}

function validateResponseShape(response: unknown, schema: SchemaField[]): ResponseDiagnostic[] {
  const diagnostics: ResponseDiagnostic[] = []
  if (response === null || response === undefined || typeof response !== 'object' || Array.isArray(response)) {
    return diagnostics
  }
  const record = response as Record<string, unknown>
  for (const field of schema) {
    if (field.required && record[field.name] === undefined) {
      diagnostics.push({ field: field.name, message: `缺少必填字段 ${field.name}` })
    }
  }
  return diagnostics
}