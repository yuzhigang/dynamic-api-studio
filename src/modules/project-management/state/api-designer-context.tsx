import { useMemo, useReducer, type PropsWithChildren } from 'react'

import { ApiDesignerContext } from '@/modules/project-management/state/api-designer-context-instance'
import { apiDesignerReducer } from '@/modules/project-management/state/api-designer-reducer'
import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

type ApiDesignerProviderProps = PropsWithChildren<{
  initialApiDefinition: ApiDefinitionDraft
}>

function createInitialTestParams(apiDefinition: ApiDefinitionDraft) {
  return Object.fromEntries(
    apiDefinition.requestParams.map((param) => [param.name, param.example ?? '']),
  )
}

export function ApiDesignerProvider({
  initialApiDefinition,
  children,
}: ApiDesignerProviderProps) {
  const [state, dispatch] = useReducer(apiDesignerReducer, {
    apiDefinition: initialApiDefinition,
    testParams: createInitialTestParams(initialApiDefinition),
    testResult: null,
  })

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <ApiDesignerContext.Provider value={value}>{children}</ApiDesignerContext.Provider>
}
