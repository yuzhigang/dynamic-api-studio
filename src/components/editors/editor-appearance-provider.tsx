import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { readStorage, writeStorage } from '@/lib/storage'
import {
  resolveEditorAppearanceFromPreference,
  type EditorAppearancePreference,
} from '@/components/editors/editor-appearance'
import { EditorAppearanceContext } from '@/components/editors/editor-appearance-context'

const STORAGE_KEY = 'das:preferences:editor-appearance'

function readInitialPreference(): EditorAppearancePreference {
  return readStorage<EditorAppearancePreference>(STORAGE_KEY, {})
}

export function EditorAppearanceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<EditorAppearancePreference>(readInitialPreference)

  const setPreference = useCallback((update: Partial<EditorAppearancePreference>) => {
    setPreferenceState((prev) => {
      const next = { ...prev, ...update }
      writeStorage(STORAGE_KEY, next)
      return next
    })
  }, [])

  const appearance = useMemo(() => resolveEditorAppearanceFromPreference(preference), [preference])

  const value = useMemo(
    () => ({
      appearance,
      preference,
      setPreference,
    }),
    [appearance, preference, setPreference],
  )

  return (
    <EditorAppearanceContext.Provider value={value}>{children}</EditorAppearanceContext.Provider>
  )
}
