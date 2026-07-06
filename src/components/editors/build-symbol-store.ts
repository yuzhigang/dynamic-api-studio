import type {
  ApiDefinitionDraft,
  WorkflowStep,
} from '@/shared/contracts/api-definition.contract'

export type SymbolSource = 'input' | 'global' | 'step' | 'design'

export type SymbolItem = {
  label: string
  detail: string
  source: SymbolSource
  /** 变量类型，用于 local / step 变量的数组属性补全。 */
  type?: string
}

export type GlobalSymbolInput = {
  name: string
  label: string
  detail?: string
}

function inferStepOutputType(step: WorkflowStep): string {
  if (step.kind === 'sql-query') {
    return 'array'
  }
  return 'object'
}

export function buildSymbolStore(
  apiDefinition: ApiDefinitionDraft,
  currentStepId?: string,
  globalSymbols: GlobalSymbolInput[] = [],
): SymbolItem[] {
  const currentIndex = apiDefinition.workflowSteps.findIndex((step) => step.id === currentStepId)
  const visibleSteps =
    currentIndex >= 0 ? apiDefinition.workflowSteps.slice(0, currentIndex) : apiDefinition.workflowSteps

  const inputSymbols: SymbolItem[] = apiDefinition.requestParams.map((param) => ({
    label: `$input.${param.name}`,
    detail: `${param.type} · ${param.description ?? '请求参数'}`,
    source: 'input',
    type: param.type,
  }))

  const stepSymbols: SymbolItem[] = visibleSteps.map((step) => ({
    label: `$${step.outputVariable}`,
    detail: `${step.title} · 上游步骤结果`,
    source: 'step',
    type: inferStepOutputType(step),
  }))

  const localSymbols: SymbolItem[] = apiDefinition.localVariables.map((variable) => ({
    label: `$${variable.name}`,
    detail: `${variable.type} · ${variable.mode}${
      variable.defaultValue !== undefined ? ` · 默认值 ${String(variable.defaultValue)}` : ''
    } · 设计时局部变量`,
    source: 'design',
    type: variable.type,
  }))

  const globalItems: SymbolItem[] = globalSymbols.map((variable) => ({
    label: `$.${variable.name}`,
    detail: `${variable.label} · ${variable.detail ?? '全局/项目变量'}`,
    source: 'global',
  }))

  return [...inputSymbols, ...stepSymbols, ...localSymbols, ...globalItems]
}
