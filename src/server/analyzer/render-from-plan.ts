import type { CompiledSqlPlan, RenderResult, VariableInfo } from '@/server/analyzer/types'
import { stringifyAst } from '@/server/analyzer/parser-wrapper'

export function renderFromPlan(
  plan: CompiledSqlPlan,
  actualParams: { input: Record<string, unknown>; global: Record<string, unknown>; local: Record<string, unknown> },
): RenderResult {
  // 1. Clone the AST
  const trimmedAst = structuredClone(plan.ast as object) as Record<string, unknown>

  // 2. Remove optional conditions
  for (const condition of plan.optionalConditions) {
    const value = getRenderedValue(condition.variablePath, plan, actualParams)

    if (condition.conditionType === 'between-expr') {
      const siblingValue = condition.siblingVariablePath
        ? getRenderedValue(condition.siblingVariablePath, plan, actualParams)
        : undefined
      if (isEmpty(value) || isEmpty(siblingValue)) {
        removeNodeAtPath(trimmedAst, condition.astPath)
      }
    } else {
      if (isEmpty(value)) {
        removeNodeAtPath(trimmedAst, condition.astPath)
      }
    }
  }

  // 3. Cleanup the AST
  cleanupAst(trimmedAst)

  // 4. Resolve variable values and build params
  const params: Array<{ value: unknown; type: string }> = []

  walkAndReplaceParams(trimmedAst, plan, actualParams, params)

  // 5. Stringify the AST
  const sql = stringifyAst(trimmedAst as unknown as Parameters<typeof stringifyAst>[0], plan.dialect)

  return { sql, params }
}

function resolveVariableValue(
  placeholderKey: string,
  plan: CompiledSqlPlan,
  actualParams: { input: Record<string, unknown>; global: Record<string, unknown>; local: Record<string, unknown> },
): unknown {
  const info = plan.varMap[placeholderKey]
  if (!info) return undefined

  let value = actualParams[info.scope]?.[info.name]

  // 数组属性访问：$orders[].id
  if (info.propertyPath && Array.isArray(value)) {
    value = value.map((item) => getProperty(item, info.propertyPath!))
  }

  return value
}

function getRenderedValue(
  placeholderKey: string,
  plan: CompiledSqlPlan,
  actualParams: { input: Record<string, unknown>; global: Record<string, unknown>; local: Record<string, unknown> },
): unknown {
  const info = plan.varMap[placeholderKey]
  if (!info) return undefined

  const value = resolveVariableValue(placeholderKey, plan, actualParams)

  if (isEmpty(value)) {
    if (info.mode === 'optional') return undefined
    if (info.mode === 'defaulted') return info.defaultValue
  }

  return value
}

function getProperty(value: unknown, path: string[]): unknown {
  let current: unknown = value
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function buildVariableFullPath(info: VariableInfo): string {
  if (info.scope === 'input') return `$input.${info.name}`
  if (info.scope === 'global') return `$.${info.name}`
  let path = `$${info.name}`
  if (info.propertyPath) {
    path += `[].${info.propertyPath.join('.')}`
  }
  return path
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

function removeNodeAtPath(ast: object, path: string[]) {
  if (path.length === 0) return

  const parentPath = path.slice(0, -1)
  const key = path[path.length - 1]
  const parent = getNodeAtPath(ast, parentPath)

  if (parent === undefined || parent === null) return

  if (Array.isArray(parent)) {
    const index = Number(key)
    if (!Number.isNaN(index)) {
      parent.splice(index, 1)
    }
  } else if (typeof parent === 'object') {
    delete (parent as Record<string, unknown>)[key]
  }
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

function cleanupAst(node: unknown) {
  if (node === null || node === undefined || typeof node !== 'object') return

  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      cleanupAst(node[i])
    }
    return
  }

  const record = node as Record<string, unknown>

  // Remove empty WHERE objects
  if (record.where !== undefined && record.where !== null && typeof record.where === 'object') {
    const where = record.where as Record<string, unknown>
    if (Object.keys(where).length === 0 || isEmptyWhere(where)) {
      delete record.where
    }
  }

  // Recurse into children
  for (const value of Object.values(record)) {
    if (typeof value === 'object' && value !== null) {
      cleanupAst(value)
    }
  }

  // Clean up dangling AND/OR in binary_expr nodes
  if (record.type === 'binary_expr' && (record.operator === 'AND' || record.operator === 'OR')) {
    const left = record.left
    const right = record.right

    if (left === undefined || left === null) {
      // Replace this node with right
      if (right !== undefined && right !== null && typeof right === 'object') {
        const replacement = right as Record<string, unknown>
        for (const key of Object.keys(record)) {
          delete (record as Record<string, unknown>)[key]
        }
        Object.assign(record, replacement)
      }
    } else if (right === undefined || right === null) {
      // Replace this node with left
      if (left !== undefined && left !== null && typeof left === 'object') {
        const replacement = left as Record<string, unknown>
        for (const key of Object.keys(record)) {
          delete (record as Record<string, unknown>)[key]
        }
        Object.assign(record, replacement)
      }
    }
  }

  // Remove empty parentheses / empty expr_list
  if (record.type === 'expr_list' && Array.isArray(record.value) && record.value.length === 0) {
    // Can't easily replace self in parent, but we can mark it
    // This is handled by parent cleanup
  }
}

function isEmptyWhere(where: Record<string, unknown>): boolean {
  // TODO: handles basic binary_expr empty cases; may need extension for other node types (e.g. unary_expr, subquery, exists)
  if (Object.keys(where).length === 0) return true
  if (where.type === 'binary_expr') {
    const left = where.left
    const right = where.right
    if ((left === undefined || left === null) && (right === undefined || right === null)) return true
  }
  return false
}

function walkAndReplaceParams(
  node: unknown,
  plan: CompiledSqlPlan,
  actualParams: { input: Record<string, unknown>; global: Record<string, unknown>; local: Record<string, unknown> },
  params: Array<{ value: unknown; type: string }>,
): boolean {
  if (node === null || node === undefined || typeof node !== 'object') return false

  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      walkAndReplaceParams(node[i], plan, actualParams, params)
    }
    return false
  }

  const record = node as Record<string, unknown>

  // For expr_list children, check if parent is IN binary_expr
  if (record.type === 'binary_expr' && record.operator === 'IN' && Array.isArray((record.right as Record<string, unknown>)?.value)) {
    const right = record.right as Record<string, unknown>
    const exprList = right.value as Array<Record<string, unknown>>

    const newExprList: Array<Record<string, unknown>> = []
    const expandedParams: Array<{ value: unknown; type: string }> = []

    for (const item of exprList) {
      if (item.type === 'param' && typeof item.value === 'string') {
        const placeholderKey = item.value
        const info = plan.varMap[placeholderKey]
        if (!info) {
          newExprList.push(item)
          continue
        }

        const value = getRenderedValue(placeholderKey, plan, actualParams)

        if (value === undefined) {
          throw new Error(`变量 ${buildVariableFullPath(info)} 没有值`)
        }

        if (Array.isArray(value)) {
          for (const v of value) {
            newExprList.push({ type: 'origin', value: '?' })
            expandedParams.push({ value: v, type: info.dataType })
          }
        } else {
          newExprList.push({ type: 'origin', value: '?' })
          expandedParams.push({ value, type: info.dataType })
        }
      } else {
        newExprList.push(item)
      }
    }

    right.value = newExprList
    params.push(...expandedParams)
    return false
  }

  // For other param nodes (not in IN), replace directly
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i]
          if (isParamNode(item)) {
            const placeholderKey = (item as Record<string, unknown>).value as string
            const info = plan.varMap[placeholderKey]
            if (info) {
              const resolvedValue = getRenderedValue(placeholderKey, plan, actualParams)

              if (resolvedValue === undefined) {
                throw new Error(`变量 ${buildVariableFullPath(info)} 没有值`)
              }

              value[i] = { type: 'origin', value: '?' }
              params.push({ value: resolvedValue, type: info.dataType })
            }
          } else {
            walkAndReplaceParams(item, plan, actualParams, params)
          }
        }
      } else {
        if (isParamNode(value)) {
          const placeholderKey = (value as Record<string, unknown>).value as string
          const info = plan.varMap[placeholderKey]
          if (info) {
            const resolvedValue = getRenderedValue(placeholderKey, plan, actualParams)

            if (resolvedValue === undefined) {
              throw new Error(`变量 ${buildVariableFullPath(info)} 没有值`)
            }

            record[key] = { type: 'origin', value: '?' }
            params.push({ value: resolvedValue, type: info.dataType })
          }
        } else {
          walkAndReplaceParams(value, plan, actualParams, params)
        }
      }
    }
  }

  return false
}

function isParamNode(node: unknown): boolean {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as Record<string, unknown>).type === 'param' &&
    typeof (node as Record<string, unknown>).value === 'string'
  )
}
