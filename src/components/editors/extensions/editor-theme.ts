import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import {
  defaultEditorAppearance,
  type EditorAppearance,
} from '@/components/editors/editor-appearance'

/**
 * 根据外观配置构建 CodeMirror 主题。字体、字号、行高、配色都从
 * {@link EditorAppearance} 派生，是这些样式的唯一来源（codemirror.css 只保留
 * 结构与交互相关的规则）。
 */
export function createEditorTheme(
  appearance: EditorAppearance = defaultEditorAppearance,
): Extension {
  const { fontFamily, fontSize, lineHeight, colors } = appearance

  return EditorView.theme({
    '&': {
      backgroundColor: colors.background,
      color: colors.foreground,
      fontSize,
    },
    '.cm-scroller': {
      fontFamily,
      lineHeight,
    },
    '.cm-content': {
      padding: '10px 0',
    },
    '.cm-line': {
      padding: '0 12px',
    },
    '.cm-activeLine': {
      backgroundColor: colors.activeLine,
    },
    '.cm-selectionBackground': {
      backgroundColor: `${colors.selection} !important`,
    },
    '.cm-gutters': {
      backgroundColor: colors.gutterBackground,
      color: colors.gutterForeground,
      borderRight: `1px solid ${colors.gutterBorder}`,
    },
    '.cm-tooltip': {
      border: '1px solid #dbe3ef',
      borderRadius: '6px',
      boxShadow: '0 8px 28px rgb(15 23 42 / 0.14)',
    },
  })
}
