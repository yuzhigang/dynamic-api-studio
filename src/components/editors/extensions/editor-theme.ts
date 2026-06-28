import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

export const editorTheme: Extension = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '13px',
  },
  '.cm-content': {
    padding: '10px 0',
  },
  '.cm-line': {
    padding: '0 12px',
  },
  '.cm-activeLine': {
    backgroundColor: '#f8fafc',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#dbeafe !important',
  },
  '.cm-tooltip': {
    border: '1px solid #dbe3ef',
    borderRadius: '6px',
    boxShadow: '0 8px 28px rgb(15 23 42 / 0.14)',
  },
})
