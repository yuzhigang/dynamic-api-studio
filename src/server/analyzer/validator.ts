import type { StaticDiagnostic, VariableReference } from '@/server/analyzer/types'

export type ValidationContext = {
  inputNames: string[]
  globalNames: string[]
  defaults?: Record<string, unknown>
}

export function validateVariableReferences(
  variables: VariableReference[],
  context: ValidationContext,
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

    if (variable.scope === 'input' && !context.inputNames.includes(variable.name)) {
      diagnostics.push({
        from: variable.from,
        to: variable.to,
        severity: 'error',
        message: `输入参数 ${variable.name} 未定义`,
      })
      continue
    }

    if (variable.scope === 'global' && !context.globalNames.includes(variable.name)) {
      diagnostics.push({
        from: variable.from,
        to: variable.to,
        severity: 'error',
        message: `全局/项目变量 ${variable.name} 未定义`,
      })
      continue
    }

    if (variable.mode === 'defaulted' && context.defaults?.[variable.name] === undefined) {
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
