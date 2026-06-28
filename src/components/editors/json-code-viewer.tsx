import { CodeMirrorEditor } from '@/components/editors/code-mirror-editor'

type JsonCodeViewerProps = {
  value: unknown
}

export function JsonCodeViewer({ value }: JsonCodeViewerProps) {
  return (
    <CodeMirrorEditor
      language="json"
      value={JSON.stringify(value, null, 2)}
      readOnly
    />
  )
}
