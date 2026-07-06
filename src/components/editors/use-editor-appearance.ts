import { useContext } from 'react'

import { EditorAppearanceContext } from '@/components/editors/editor-appearance-context'

export function useEditorAppearance() {
  const context = useContext(EditorAppearanceContext)
  if (!context) {
    throw new Error('useEditorAppearance must be used within EditorAppearanceProvider')
  }
  return context
}
