import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

export type SymbolSource = 'input' | 'global' | 'step'

export type SymbolItem = {
  label: string
  detail: string
  source: SymbolSource
}

export type GlobalSymbolInput = {
  name: string
  label: string
  detail?: string
}

export function buildSymbolStore(
  apiDefinition: ApiDefinitionDraft,
  currentStepId?: string,
  globalSymbols: GlobalSymbolInput[] = [],
): SymbolItem[] {
  const currentIndex = apiDefinition.workflowSteps.findIndex((step) => step.id === currentStepId)
  const visibleSteps =
    currentIndex >= 0 ? apiDefinition.workflowSteps.slice(0, currentIndex) : apiDefinition.workflowSteps

  return [
    ...apiDefinition.requestParams.map((param) => ({
      label: `$input.${param.name}`,
      detail: `${param.type} · ${param.description ?? '请求参数'}`,
      source: 'input' as const,
    })),
    ...visibleSteps.map((step) => ({
      label: `$${step.outputVariable}`,
      detail: `${step.title} · 上游步骤结果`,
      source: 'step' as const,
    })),
    ...globalSymbols.map((variable) => ({
      label: `$.${variable.name}`,
      detail: `${variable.label} · ${variable.detail ?? '全局/项目变量'}`,
      source: 'global' as const,
    })),
  ]
}
