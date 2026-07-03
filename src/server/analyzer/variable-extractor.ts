import type { VariableMode, VariableReference, VariableScope } from '@/server/analyzer/types'

const DOTTED_IDENTIFIER = '[a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*'

const VARIABLE_PATTERN = new RegExp(
  `\\$(input\\.|\\.|)(${DOTTED_IDENTIFIER})([?!])?(\\[\\])?(?:\\.(${DOTTED_IDENTIFIER}))?(?![\\w.])`,
  'g',
)

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

function isFollowedByFunctionCall(sql: string, matchEndIndex: number): boolean {
  let index = matchEndIndex
  while (index < sql.length && /\s/.test(sql[index])) {
    index++
  }
  return sql[index] === '('
}

type PreprocessVarMapEntry = {
  raw: string
  from: number
  to: number
  scope: VariableScope
  name: string
  fullPath: string
  mode: VariableMode
  propertyPath?: string[]
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

    // Reject if the match is followed by optional whitespace and '(' (function call)
    const matchEndIndex = match.index! + raw.length
    if (isFollowedByFunctionCall(sql, matchEndIndex)) {
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
  varMap: Record<string, PreprocessVarMapEntry>
} {
  VARIABLE_PATTERN.lastIndex = 0
  const varMap: Record<string, PreprocessVarMapEntry> = {}
  let counter = 0

  const processedSql = sql.replace(VARIABLE_PATTERN, (raw, prefix, baseName, suffix, arrayMarker, property, offset) => {
    const matchEndIndex = offset + raw.length
    if (isFollowedByFunctionCall(sql, matchEndIndex)) {
      return raw
    }

    const meta = buildVariableMeta(prefix, baseName, suffix, arrayMarker, property)
    const placeholderKey = `__var_${counter}__`
    counter++

    varMap[placeholderKey] = {
      raw,
      from: offset,
      to: offset + raw.length,
      scope: meta.scope,
      name: meta.name,
      fullPath: meta.fullPath,
      mode: meta.mode,
      propertyPath: meta.propertyPath,
    }
    return `:${placeholderKey}`
  })

  return { processedSql, varMap }
}
