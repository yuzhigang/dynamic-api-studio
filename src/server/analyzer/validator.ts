import type { StaticDiagnostic, VariableContext, VariableReference } from '@/server/analyzer/types'

export function validateVariableReferences(
  variables: VariableReference[],
  context: VariableContext,
): StaticDiagnostic[] {
  const diagnostics: StaticDiagnostic[] = []

  for (const variable of variables) {
    if (variable.raw.includes('(') || variable.raw.includes(')')) {
      diagnostics.push({
        from: variable.from,
        to: variable.to,
        severity: 'error',
        message: `SQL 中不支持函数调用：${variable.raw}`,
      })
      continue
    }

    const exists = context.has(variable.scope, variable.name)
    if (!exists) {
      diagnostics.push({
        from: variable.from,
        to: variable.to,
        severity: 'error',
        message: buildMissingMessage(variable.scope, variable.name),
      })
      continue
    }

    const value = context.get(variable.scope, variable.name)
    if (variable.mode === 'defaulted' && value?.defaultValue === undefined) {
      diagnostics.push({
        from: variable.from,
        to: variable.to,
        severity: 'error',
        message: `默认变量 ${variable.name} 缺少默认值`,
      })
    }
  }

  return diagnostics
}

function buildMissingMessage(scope: VariableReference['scope'], name: string): string {
  if (scope === 'input') {
    return `输入参数 ${name} 未定义`
  }
  if (scope === 'global') {
    return `全局/项目变量 ${name} 未定义`
  }
  return `局部变量 ${name} 未定义`
}
