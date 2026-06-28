import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

export type SymbolItem = {
  label: string
  detail: string
  source: 'input' | 'step' | 'context'
}

export function buildSymbolStore(apiDefinition: ApiDefinitionDraft, currentStepId?: string): SymbolItem[] {
  const currentIndex = apiDefinition.workflowSteps.findIndex((step) => step.id === currentStepId)
  const visibleSteps =
    currentIndex >= 0 ? apiDefinition.workflowSteps.slice(0, currentIndex) : apiDefinition.workflowSteps

  return [
    ...apiDefinition.requestParams.map((param) => ({
      label: `$${param.name}${param.required ? '!' : '?'}`,
      detail: `${param.type} · ${param.description ?? '请求参数'}`,
      source: 'input' as const,
    })),
    ...visibleSteps.map((step) => ({
      label: `$${step.resultVariable}`,
      detail: `${step.title} · 上游步骤结果`,
      source: 'step' as const,
    })),
    {
      label: '$ctx.tenantId',
      detail: 'string · 当前租户',
      source: 'context',
    },
    {
      label: '$ctx.userId',
      detail: 'string · 当前用户',
      source: 'context',
    },
  ]
}
