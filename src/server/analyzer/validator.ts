import type { SqlVariableReference } from '@/server/analyzer/variable-extractor'

export function validateVariableReferences(variables: SqlVariableReference[]) {
  return variables.map((variable) => ({
    variable: variable.raw,
    valid: Boolean(variable.name),
  }))
}
