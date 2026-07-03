import { createVariableContext, type VariableContext } from '@/server/analyzer/types'
import { evalExpressionFromContext } from '@/server/expression/expression-evaluator'
import { buildDependencyGraph, topologicalSort } from '@/server/expression/dependency-graph'
import type { ApiLocalVariable } from '@/shared/schemas/api-definition.schema'

export type BuildApiVariableContextInput = {
  input: Record<string, unknown>
  global: Record<string, unknown>
  localVariables: ApiLocalVariable[]
}

/**
 * 构建 API 执行期的 VariableContext。
 *
 * 1. 把 input / global 原始值注入对应作用域
 * 2. 按依赖拓扑顺序计算 API 设计时 local 变量
 * 3. 将计算结果写入 local 作用域
 */
export function buildApiVariableContext(input: BuildApiVariableContextInput): VariableContext {
  const context = createVariableContext()

  for (const [name, value] of Object.entries(input.input)) {
    context.set('input', name, { value, type: inferType(value) })
  }

  for (const [name, value] of Object.entries(input.global)) {
    context.set('global', name, { value, type: inferType(value) })
  }

  const graph = buildDependencyGraph(
    input.localVariables.map((v) => ({ name: v.name, expression: v.value.kind === 'expression' ? v.value.expression : undefined })),
  )
  const order = topologicalSort(graph)

  for (const variable of order) {
    const def = input.localVariables.find((v) => v.name === variable.name)
    if (!def) continue

    let value: unknown
    if (def.value.kind === 'literal') {
      value = def.value.literal
    } else {
      value = evalExpressionFromContext(def.value.expression, context)
    }

    context.set('local', def.name, {
      value,
      type: def.type,
      defaultValue: def.defaultValue,
    })
  }

  return context
}

function inferType(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'object' && value !== null) return 'object'
  return 'string'
}

export function getTypeDefaultValue(type: string): unknown {
  switch (type) {
    case 'string':
      return ''
    case 'integer':
    case 'decimal':
      return 0
    case 'boolean':
      return false
    case 'array':
      return []
    case 'object':
      return {}
    default:
      return undefined
  }
}
