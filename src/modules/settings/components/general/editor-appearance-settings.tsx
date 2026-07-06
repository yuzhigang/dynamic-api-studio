import { CodeEditorShell } from '@/components/editors/code-editor-shell'
import { CodeMirrorEditor } from '@/components/editors/code-mirror-editor'
import { EditorAppearanceControls } from '@/components/editors/editor-appearance-controls'
import { useEditorAppearance } from '@/components/editors/use-editor-appearance'
import { Label } from '@/components/ui/label'

const PREVIEW_SQL = `SELECT
  o.order_id,
  o.order_no,
  o.customer_name
FROM order_main o
WHERE o.status IN ($status)
LIMIT $(pageSize)`

export function EditorAppearanceSettings() {
  const { appearance } = useEditorAppearance()

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-slate-900">编辑器外观</h2>
        <p className="text-sm text-slate-500">调整代码编辑器字体、字号和配色方案，所有 SQL / JS / JSON 编辑器会实时生效。</p>
      </div>

      <div className="max-w-md">
        <EditorAppearanceControls />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">实时预览</Label>
        <CodeEditorShell title="SQL 预览" maxHeight={260} showAppearanceSettings={false}>
          <CodeMirrorEditor language="sql" value={PREVIEW_SQL} readOnly appearance={appearance} />
        </CodeEditorShell>
      </div>
    </div>
  )
}
