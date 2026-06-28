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
  varMap: Record<string, VarMapEntry>,
): OptionalConditionIndex[] {
  const conditions: OptionalConditionIndex[] = []

  function walk(node: unknown, path: string[]) {
    if (node === null || node === undefined || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...path, String(index)]))
      return
    }

    const record = node as Record<string, unknown>

    // Find param nodes with __var_N__ placeholders
    if (record.type === 'param' && typeof record.value === 'string') {
      const match = record.value.match(/^__var_(\d+)__$/)
      if (match) {
        const placeholderKey = record.value
        const entry = varMap[placeholderKey]
        if (entry?.mode === 'optional') {
          const condition = findEnclosingCondition(ast, path)
          if (condition) {
            conditions.push({
              variablePath: placeholderKey,
              astPath: condition.astPath,
              conditionType: condition.conditionType,
              siblingVariablePath: condition.siblingVariablePath,
            })
          }
        }
      }
      return // don't recurse into param
    }

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'object') {
        walk(value, [...path, key])
      }
    }
  }

  walk(ast, [])

  // Deduplicate entries with same variablePath + astPath (keep first)
  const seen = new Set<string>()
  return conditions.filter((condition) => {
    const key = `${condition.variablePath}:${condition.astPath.join('.')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function findEnclosingCondition(
  root: unknown,
  paramPath: string[],
): { astPath: string[]; conditionType: OptionalConditionIndex['conditionType']; siblingVariablePath?: string } | null {
  // Walk up the path to find candidate binary_expr nodes
  for (let i = paramPath.length - 1; i >= 0; i--) {
    const candidatePath = paramPath.slice(0, i)
    const node = getNodeAtPath(root, candidatePath)

    if (!isBinaryExpr(node)) continue

    const operator = (node as Record<string, unknown>).operator

    // Verify the param is actually a descendant of this binary_expr's left or right branch
    const paramKey = paramPath[i]
    const isDirectOperand =
      paramKey === 'left' ||
      paramKey === 'right' ||
      (paramKey === 'value' && candidatePath[candidatePath.length - 1] === 'right')

    if (!isDirectOperand) continue

    if (operator === 'BETWEEN') {
      const sibling = findSiblingInBetween(node, paramPath)
      return {
        astPath: candidatePath,
        conditionType: 'between-expr',
        siblingVariablePath: sibling,
      }
    }

    if (operator === 'OR') {
      return { astPath: candidatePath, conditionType: 'or-block' }
    }

    if (operator === 'AND') {
      return { astPath: candidatePath, conditionType: 'and-condition' }
    }

    // Comparison operators (=, <>, <, >, etc.)
    // Check if this comparison is a direct operand of an OR parent
    const parentPath = candidatePath.slice(0, -1)
    const parentNode = parentPath.length > 0 ? getNodeAtPath(root, parentPath) : null
    if (isBinaryExpr(parentNode) && (parentNode as Record<string, unknown>).operator === 'OR') {
      const childKey = candidatePath[candidatePath.length - 1]
      if (childKey === 'left' || childKey === 'right') {
        return { astPath: parentPath, conditionType: 'or-block' }
      }
    }

    return { astPath: candidatePath, conditionType: 'and-condition' }
  }

  return null
}

function isBinaryExpr(node: unknown): node is Record<string, unknown> {
  return typeof node === 'object' && node !== null && (node as Record<string, unknown>).type === 'binary_expr'
}

function getNodeAtPath(root: unknown, path: string[]): unknown {
  let current: unknown = root
  for (const key of path) {
    if (current === null || current === undefined) return undefined
    if (Array.isArray(current)) {
      current = current[Number(key)]
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return current
}

function findSiblingInBetween(
  betweenNode: Record<string, unknown>,
  paramPath: string[],
): string | undefined {
  const right = betweenNode.right
  if (!right || typeof right !== 'object' || !Array.isArray((right as Record<string, unknown>).value)) {
    return undefined
  }

  const values = (right as Record<string, unknown>).value as Array<Record<string, unknown>>
  const paramKey = paramPath[paramPath.length - 1]
  const paramIndex = Number(paramKey)

  if (Number.isNaN(paramIndex)) return undefined

  const sibling = values[paramIndex === 0 ? 1 : 0]
  if (sibling?.type === 'param' && typeof sibling.value === 'string') {
    return sibling.value
  }
  return undefined
}
