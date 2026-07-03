import type { VariableContext, VariableScope } from '@/server/analyzer/types'

export type ExpressionContext = {
  /** API 查询参数 */
  input: Record<string, unknown>
  /** 平台/项目全局变量和函数 */
  global: Record<string, unknown>
  /** API 内部局部变量（API 设计时变量 + 前置步骤输出） */
  local: Record<string, unknown>
}

/**
 * 在轻量沙箱中执行表达式。
 *
 * 使用 `new Function` 将 input/global/local 注入为作用域变量，
 * 并把表达式中的 `$input.xxx`、`$.xxx`、`$xxx` 分别映射到对应作用域。
 *
 * 适用于内部受信环境；不隔离进程，也不做语法白名单限制。
 */
export function evalExpression(code: string, context: ExpressionContext): unknown {
  const transformed = transformVariableReferences(code)
  const fn = new Function('input', 'global', 'local', `return (${transformed});`)
  return fn(context.input, context.global, context.local)
}

function transformVariableReferences(code: string): string {
  return (
    code
      // 先替换最长前缀，避免被后面的规则误匹配
      .replace(/\$input\.([a-zA-Z_]\w*)/g, 'input.$1')
      .replace(/\$\.([a-zA-Z_]\w*)/g, 'global.$1')
      .replace(/\$([a-zA-Z_]\w*)/g, 'local.$1')
  )
}

/**
 * 从统一的 VariableContext 中提取三个作用域的原始值，再执行表达式。
 */
export function evalExpressionFromContext(code: string, context: VariableContext): unknown {
  const scopeValues: Record<VariableScope, Record<string, unknown>> = {
    input: extractRawValues(context, 'input'),
    global: extractRawValues(context, 'global'),
    local: extractRawValues(context, 'local'),
  }
  return evalExpression(code, scopeValues)
}

function extractRawValues(context: VariableContext, scope: VariableScope): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const name of context.keys(scope)) {
    result[name] = context.get(scope, name)?.value
  }
  return result
}
