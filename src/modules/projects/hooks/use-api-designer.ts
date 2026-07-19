import { useContext } from 'react'

import { ApiDesignerContext } from '@/modules/projects/state/api-designer-context-instance'

export function useApiDesigner() {
  const context = useContext(ApiDesignerContext)

  if (!context) {
    throw new Error('useApiDesigner must be used within ApiDesignerProvider')
  }

  return context
}
