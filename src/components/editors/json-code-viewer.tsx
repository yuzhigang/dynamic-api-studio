import { CodeMirrorEditor } from '@/components/editors/code-mirror-editor'
import { resolveEditorAppearance, type EditorAppearance } from '@/components/editors/editor-appearance'
import { useEditorAppearance } from '@/components/editors/use-editor-appearance'

type JsonCodeViewerProps = {
  value: unknown
  /** 覆盖全局编辑器外观（字体、字号、配色）。 */
  appearance?: Partial<EditorAppearance>
}

export function JsonCodeViewer({ value, appearance }: JsonCodeViewerProps) {
  const { appearance: globalAppearance } = useEditorAppearance()
  const resolvedAppearance = appearance ? resolveEditorAppearance(appearance) : globalAppearance

  return (
    <CodeMirrorEditor
      language="json"
      value={JSON.stringify(value, null, 2)}
      appearance={resolvedAppearance}
      readOnly
    />
  )
}
