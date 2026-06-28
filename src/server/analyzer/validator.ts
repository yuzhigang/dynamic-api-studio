import type { VariableRef } from '@/server/analyzer/types'

export function validateVariableReferences(variables: VariableRef[]) {
  return variables.map((variable) => ({
    variable: variable.raw,
    valid: Boolean(variable.name),
  }))
}
