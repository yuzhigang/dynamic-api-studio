import { CodeMirrorEditor } from '@/components/editors/code-mirror-editor'
import type { SymbolItem } from '@/components/editors/build-symbol-store'

type SqlEditorProps = {
  value: string
  symbols?: SymbolItem[]
  /** 为 true 时编辑器高度由内容撑开。 */
  autoHeight?: boolean
  onChange: (value: string) => void
}

export function SqlEditor({ value, symbols, autoHeight, onChange }: SqlEditorProps) {
  return (
    <CodeMirrorEditor
      language="sql"
      value={value}
      symbols={symbols}
      autoHeight={autoHeight}
      onChange={onChange}
    />
  )
}
