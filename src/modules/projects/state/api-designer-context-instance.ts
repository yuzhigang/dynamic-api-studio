import { createContext, type Dispatch } from 'react'

import type { ApiDesignerAction, ApiDesignerState } from '@/modules/projects/state/api-designer-types'

export type ApiDesignerContextValue = {
  state: ApiDesignerState
  dispatch: Dispatch<ApiDesignerAction>
}

export const ApiDesignerContext = createContext<ApiDesignerContextValue | null>(null)
