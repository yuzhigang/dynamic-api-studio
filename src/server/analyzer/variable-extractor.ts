import type { VariableMode, VariableRef, VariableSource } from '@/server/analyzer/types'

const VARIABLE_PATTERN = /\$(input\.|\.)([a-zA-Z_][\w.]*)([?!])?/g

function resolveNamespace(prefix: string): VariableSource {
  return prefix === 'input.' ? 'input' : 'global'
}

function resolveMode(suffix: string | undefined): VariableMode {
  if (suffix === '?') return 'optional'
  if (suffix === '!') return 'defaulted'
  return 'required'
}

export function extractVariablesFromSql(sql: string): VariableRef[] {
  const refs: VariableRef[] = []

  for (const match of sql.matchAll(VARIABLE_PATTERN)) {
    const raw = match[0]
    const prefix = match[1]
    const path = match[2]
    const suffix = match[3]

    // Reject if the match is immediately followed by '(' (function call)
    const matchEndIndex = match.index! + raw.length
    if (sql[matchEndIndex] === '(') {
      continue
    }

    const namespace = resolveNamespace(prefix)
    const fullPath = `$${prefix}${path}`

    refs.push({
      raw,
      namespace,
      name: path,
      fullPath,
      mode: resolveMode(suffix),
      // TODO: determine sqlKind and dataType from AST context in Task 4+
      sqlKind: 'value',
      dataType: 'string',
      astPath: [],
    })
  }

  return refs
}
