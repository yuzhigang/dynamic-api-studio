/**
 * 代码编辑器的外观配置（字体、字号、行高、配色）。
 *
 * 这是所有 CodeMirror 编辑器样式的唯一来源：
 * - 想全局调整 → 通过设置页修改偏好，最终由 {@link resolveEditorAppearanceFromPreference} 解析
 * - 想单个编辑器覆盖 → 给 CodeMirrorEditor / SqlEditor 传 `appearance`
 */
export type EditorAppearanceColorScheme = 'light' | 'dark'

export type EditorAppearanceColors = {
  background: string
  foreground: string
  /** 当前行高亮背景 */
  activeLine: string
  /** 选区背景 */
  selection: string
  gutterBackground: string
  gutterForeground: string
  gutterBorder: string
}

export type EditorAppearance = {
  /** CSS font-family，整串传入 */
  fontFamily: string
  /** CSS font-size，如 '14px' */
  fontSize: string
  /** CSS line-height，如 '1.6' */
  lineHeight: string
  colors: EditorAppearanceColors
}

export type EditorAppearancePreference = {
  fontFamily?: string
  fontSize?: string
  lineHeight?: string
  colorScheme?: EditorAppearanceColorScheme
}

export const defaultEditorAppearance: EditorAppearance = {
  fontFamily:
    '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  fontSize: '14px',
  lineHeight: '1.6',
  colors: {
    background: '#ffffff',
    foreground: '#0f172a',
    activeLine: '#f8fafc',
    selection: '#dbeafe',
    gutterBackground: '#f8fafc',
    gutterForeground: '#64748b',
    gutterBorder: 'hsl(var(--border))',
  },
}

export const editorAppearanceColorSchemes: Record<EditorAppearanceColorScheme, EditorAppearanceColors> = {
  light: {
    background: '#ffffff',
    foreground: '#0f172a',
    activeLine: '#f8fafc',
    selection: '#dbeafe',
    gutterBackground: '#f8fafc',
    gutterForeground: '#64748b',
    gutterBorder: 'hsl(var(--border))',
  },
  dark: {
    background: '#0f172a',
    foreground: '#f1f5f9',
    activeLine: '#1e293b',
    selection: '#1e3a8a',
    gutterBackground: '#1e293b',
    gutterForeground: '#94a3b8',
    gutterBorder: '#334155',
  },
}

/** 把可选的覆盖项合并到默认外观上（colors 做浅合并）。 */
export function resolveEditorAppearance(override?: Partial<EditorAppearance>): EditorAppearance {
  if (!override) {
    return defaultEditorAppearance
  }

  return {
    ...defaultEditorAppearance,
    ...override,
    colors: { ...defaultEditorAppearance.colors, ...override.colors },
  }
}

/** 根据用户偏好解析出完整的编辑器外观。 */
export function resolveEditorAppearanceFromPreference(
  preference: EditorAppearancePreference = {},
): EditorAppearance {
  const colorScheme = preference.colorScheme ?? 'light'

  return {
    ...defaultEditorAppearance,
    ...preference,
    colors: editorAppearanceColorSchemes[colorScheme],
  }
}
