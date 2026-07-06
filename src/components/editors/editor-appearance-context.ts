import { createContext } from 'react'

import type { EditorAppearance, EditorAppearancePreference } from '@/components/editors/editor-appearance'

export type EditorAppearanceContextValue = {
  /** 解析后的完整外观，可直接传给 CodeMirrorEditor。 */
  appearance: EditorAppearance
  /** 当前保存的偏好（未解析）。 */
  preference: EditorAppearancePreference
  /** 合并更新偏好；传入部分字段即可。 */
  setPreference: (update: Partial<EditorAppearancePreference>) => void
}

export const EditorAppearanceContext = createContext<EditorAppearanceContextValue | null>(null)
