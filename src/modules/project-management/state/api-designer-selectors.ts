import type { ApiDesignerState } from '@/modules/project-management/state/api-designer-types'

export function selectBodyParams(state: ApiDesignerState) {
  return state.apiDefinition.requestParams.filter((param) => param.location === 'body')
}

export function selectRequiredParams(state: ApiDesignerState) {
  return state.apiDefinition.requestParams.filter((param) => param.required)
}
