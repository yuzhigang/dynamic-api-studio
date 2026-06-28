import { CodeMirrorEditor } from '@/components/editors/code-mirror-editor'

type JavascriptEditorProps = {
  value: string
  /** 为 true 时编辑器高度由内容撑开。 */
  autoHeight?: boolean
  onChange: (value: string) => void
}

export function JavascriptEditor({ value, autoHeight, onChange }: JavascriptEditorProps) {
  return (
    <CodeMirrorEditor
      language="javascript"
      value={value}
      autoHeight={autoHeight}
      onChange={onChange}
    />
  )
}
