import type { VariableMode, VariableRef, VariableScope } from '@/server/analyzer/types'

const VARIABLE_PATTERN = /\$(input\.|\.|)([a-zA-Z_][\w.]*)([?!])?/g

function resolveScope(prefix: string): VariableScope {
  if (prefix === 'input.') return 'input'
  return 'global'
}

function resolveMode(suffix: string | undefined): VariableMode {
  if (suffix === '?') return 'optional'
  if (suffix === '!') return 'defaulted'
  return 'required'
}

export function extractVariablesFromSql(sql: string): VariableRef[] {
  VARIABLE_PATTERN.lastIndex = 0
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

    const scope = resolveScope(prefix)
    const fullPath = `$${prefix}${path}`

    refs.push({
      raw,
      from: match.index!,
      to: match.index! + raw.length,
      scope,
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

export function preprocessSql(sql: string): {
  processedSql: string
  varMap: Record<string, { raw: string; from: number; to: number; scope: VariableScope; name: string; fullPath: string; mode: VariableMode }>
} {
  VARIABLE_PATTERN.lastIndex = 0
  const varMap: Record<string, { raw: string; from: number; to: number; scope: VariableScope; name: string; fullPath: string; mode: VariableMode }> = {}
  let counter = 0

  const processedSql = sql.replace(VARIABLE_PATTERN, (raw, prefix, path, suffix, offset) => {
    const matchEndIndex = offset + raw.length
    if (sql[matchEndIndex] === '(') {
      return raw
    }

    const scope = resolveScope(prefix)
    const fullPath = `$${prefix}${path}`
    const mode = resolveMode(suffix)
    const placeholderKey = `__var_${counter}__`
    counter++

    varMap[placeholderKey] = { raw, from: offset, to: offset + raw.length, scope, name: path, fullPath, mode }
    return `:${placeholderKey}`
  })

  return { processedSql, varMap }
}
