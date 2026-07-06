import { CodeMirrorEditor } from '@/components/editors/code-mirror-editor'
import { resolveEditorAppearance, type EditorAppearance } from '@/components/editors/editor-appearance'
import { useEditorAppearance } from '@/components/editors/use-editor-appearance'

type JavascriptEditorProps = {
  value: string
  /** 为 true 时编辑器高度由内容撑开。 */
  autoHeight?: boolean
  /** 覆盖全局编辑器外观（字体、字号、配色）。 */
  appearance?: Partial<EditorAppearance>
  onChange: (value: string) => void
}

export function JavascriptEditor({ value, autoHeight, appearance, onChange }: JavascriptEditorProps) {
  const { appearance: globalAppearance } = useEditorAppearance()
  const resolvedAppearance = appearance ? resolveEditorAppearance(appearance) : globalAppearance

  return (
    <CodeMirrorEditor
      language="javascript"
      value={value}
      autoHeight={autoHeight}
      appearance={resolvedAppearance}
      onChange={onChange}
    />
  )
}
