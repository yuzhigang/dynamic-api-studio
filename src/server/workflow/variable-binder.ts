import type { VariableContext, VariableScope } from '@/server/analyzer/types'

export type BoundScopes = {
  input: Record<string, unknown>
  global: Record<string, unknown>
  local: Record<string, unknown>
}

/** Extract raw values for one scope from a VariableContext. */
export function extractRawValues(context: VariableContext, scope: VariableScope): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const name of context.keys(scope)) {
    result[name] = context.get(scope, name)?.value
  }
  return result
}

/** Build the {input, global, local} record expected by renderFromPlan. */
export function bindVariableValues(context: VariableContext): BoundScopes {
  return {
    input: extractRawValues(context, 'input'),
    global: extractRawValues(context, 'global'),
    local: extractRawValues(context, 'local'),
  }
}