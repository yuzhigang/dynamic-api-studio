import type { OptionalConditionIndex } from '@/server/analyzer/types'

export type VarMapEntry = {
  raw: string
  namespace: 'input' | 'global'
  name: string
  fullPath: string
  mode: 'required' | 'optional' | 'defaulted'
}

export function buildOptionalConditionIndex(
  ast: unknown,
  varMap: Record<string, VarMapEntry>
): OptionalConditionIndex[] {
  const results: OptionalConditionIndex[] = []

  // Collect all param nodes with their paths
  function walk(node: unknown, path: string[]) {
    if (node === null || node === undefined || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...path, String(index)]))
      return
    }

    const record = node as Record<string, unknown>

    if (record.type === 'param' && typeof record.value === 'string') {
      const placeholder = record.value
      const entry = varMap[placeholder]
      if (entry && entry.mode === 'optional') {
        const enclosingBinary = findEnclosingBinaryExpr(ast, path)
        if (enclosingBinary) {
          const conditionType = determineConditionType(enclosingBinary.node)
          if (conditionType === 'between-expr') {
            const siblingPlaceholder = findSiblingPlaceholder(record, enclosingBinary.path, ast)
            results.push({
              variablePath: placeholder,
              astPath: enclosingBinary.path,
              conditionType,
              siblingVariablePath: siblingPlaceholder ?? undefined,
            })
          } else {
            results.push({
              variablePath: placeholder,
              astPath: enclosingBinary.path,
              conditionType,
            })
          }
        }
      }
      return
    }

    for (const [key, value] of Object.entries(record)) {
      if (value !== null && typeof value === 'object') {
        walk(value, [...path, key])
      }
    }
  }

  function findEnclosingBinaryExpr(
    root: unknown,
    paramPath: string[]
  ): { node: Record<string, unknown>; path: string[] } | null {
    // Walk up the path to find the nearest binary_expr that is a condition boundary.
    // Prefer OR or BETWEEN; fallback to any binary_expr.
    let fallback: { node: Record<string, unknown>; path: string[] } | null = null

    for (let i = paramPath.length; i >= 1; i--) {
      const candidatePath = paramPath.slice(0, i)
      const candidate = getNodeAtPath(root, candidatePath)
      if (
        candidate &&
        typeof candidate === 'object' &&
        !Array.isArray(candidate) &&
        (candidate as Record<string, unknown>).type === 'binary_expr'
      ) {
        const record = candidate as Record<string, unknown>
        const operator =
          typeof record.operator === 'string' ? record.operator.toUpperCase() : ''
        if (operator === 'OR' || operator === 'BETWEEN') {
          return { node: record, path: candidatePath }
        }
        if (!fallback) {
          fallback = { node: record, path: candidatePath }
        }
      }
    }

    return fallback
  }

  function determineConditionType(
    binaryNode: Record<string, unknown>
  ): 'and-condition' | 'or-block' | 'between-expr' {
    const operator =
      typeof binaryNode.operator === 'string' ? binaryNode.operator.toUpperCase() : ''

    if (operator === 'BETWEEN') {
      return 'between-expr'
    }
    if (operator === 'OR') {
      return 'or-block'
    }
    return 'and-condition'
  }

  function findSiblingPlaceholder(
    paramNode: Record<string, unknown>,
    binaryPath: string[],
    rootAst: unknown
  ): string | null {
    const betweenNode = getNodeAtPath(rootAst, binaryPath)
    if (!betweenNode || typeof betweenNode !== 'object' || Array.isArray(betweenNode)) {
      return null
    }

    const record = betweenNode as Record<string, unknown>
    const right = record.right
    if (!right || typeof right !== 'object' || Array.isArray(right)) {
      return null
    }

    const rightRecord = right as Record<string, unknown>
    const values = rightRecord.value
    if (!Array.isArray(values)) {
      return null
    }

    for (const item of values) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const itemRecord = item as Record<string, unknown>
        if (
          itemRecord.type === 'param' &&
          typeof itemRecord.value === 'string' &&
          itemRecord.value !== paramNode.value
        ) {
          return itemRecord.value
        }
      }
    }

    return null
  }

  function getNodeAtPath(root: unknown, path: string[]): unknown {
    let current: unknown = root
    for (const segment of path) {
      if (current === null || current === undefined) return undefined
      if (Array.isArray(current)) {
        const index = parseInt(segment, 10)
        if (isNaN(index)) return undefined
        current = current[index]
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[segment]
      } else {
        return undefined
      }
    }
    return current
  }

  walk(ast, [])
  return results
}
