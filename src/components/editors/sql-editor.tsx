import { CodeMirrorEditor } from '@/components/editors/code-mirror-editor'
import { resolveEditorAppearance, type EditorAppearance } from '@/components/editors/editor-appearance'
import { useEditorAppearance } from '@/components/editors/use-editor-appearance'
import type { SymbolItem } from '@/components/editors/build-symbol-store'

type SqlEditorProps = {
  value: string
  symbols?: SymbolItem[]
  /** 为 true 时编辑器高度由内容撑开。 */
  autoHeight?: boolean
  /** 覆盖全局编辑器外观（字体、字号、配色）。 */
  appearance?: Partial<EditorAppearance>
  onChange: (value: string) => void
}

export function SqlEditor({ value, symbols, autoHeight, appearance, onChange }: SqlEditorProps) {
  const { appearance: globalAppearance } = useEditorAppearance()
  const resolvedAppearance = appearance ? resolveEditorAppearance(appearance) : globalAppearance

  return (
    <CodeMirrorEditor
      language="sql"
      value={value}
      symbols={symbols}
      autoHeight={autoHeight}
      appearance={resolvedAppearance}
      onChange={onChange}
    />
  )
}
