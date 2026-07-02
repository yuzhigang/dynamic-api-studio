import type { VariableMode, VariableReference, VariableScope } from '@/server/analyzer/types'

const VARIABLE_PATTERN = /\$(input\.|\.|)([a-zA-Z_][\w.]*)([?!])?(\[\])?(?:\.([a-zA-Z_][\w.]*))?/g

function resolveScope(prefix: string): VariableScope {
  if (prefix === 'input.') return 'input'
  if (prefix === '.') return 'global'
  return 'local'
}

function resolveMode(suffix: string | undefined): VariableMode {
  if (suffix === '?') return 'optional'
  if (suffix === '!') return 'defaulted'
  return 'required'
}

function buildVariableMeta(
  prefix: string,
  baseName: string,
  suffix: string | undefined,
  arrayMarker: string | undefined,
  property: string | undefined,
) {
  const scope = resolveScope(prefix)
  const modeSuffix = suffix ?? ''
  const arraySuffix = arrayMarker ? '[]' : ''
  const propertySuffix = property ? `.${property}` : ''
  const name = baseName
  const fullPath = `$${prefix}${baseName}${modeSuffix}${arraySuffix}${propertySuffix}`
  const mode = resolveMode(suffix)
  const propertyPath = property ? property.split('.') : undefined
  return { scope, name, fullPath, mode, propertyPath }
}

export function extractVariablesFromSql(sql: string): VariableReference[] {
  VARIABLE_PATTERN.lastIndex = 0
  const refs: VariableReference[] = []

  for (const match of sql.matchAll(VARIABLE_PATTERN)) {
    const raw = match[0]
    const prefix = match[1]
    const baseName = match[2]
    const suffix = match[3]
    const arrayMarker = match[4]
    const property = match[5]

    // Reject if the match is immediately followed by '(' (function call)
    const matchEndIndex = match.index! + raw.length
    if (sql[matchEndIndex] === '(') {
      continue
    }

    const meta = buildVariableMeta(prefix, baseName, suffix, arrayMarker, property)

    refs.push({
      raw,
      from: match.index!,
      to: match.index! + raw.length,
      scope: meta.scope,
      name: meta.name,
      fullPath: meta.fullPath,
      mode: meta.mode,
      propertyPath: meta.propertyPath,
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

  const processedSql = sql.replace(VARIABLE_PATTERN, (raw, prefix, baseName, suffix, arrayMarker, property, offset) => {
    const matchEndIndex = offset + raw.length
    if (sql[matchEndIndex] === '(') {
      return raw
    }

    const meta = buildVariableMeta(prefix, baseName, suffix, arrayMarker, property)
    const placeholderKey = `__var_${counter}__`
    counter++

    varMap[placeholderKey] = { raw, from: offset, to: offset + raw.length, scope: meta.scope, name: meta.name, fullPath: meta.fullPath, mode: meta.mode }
    return `:${placeholderKey}`
  })

  return { processedSql, varMap }
}
