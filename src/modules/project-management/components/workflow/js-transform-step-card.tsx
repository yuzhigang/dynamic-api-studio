import { CodeEditorShell } from '@/components/editors/code-editor-shell'
import { JavascriptEditor } from '@/components/editors/javascript-editor'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/project-management/state/api-designer-actions'
import type { WorkflowStep } from '@/shared/contracts/api-definition.contract'

type JsTransformStepCardProps = {
  step: WorkflowStep
}

export function JsTransformStepCard({ step }: JsTransformStepCardProps) {
  const { dispatch } = useApiDesigner()

  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-700">转换脚本（JS）</div>
      <CodeEditorShell maxHeight={220}>
        <JavascriptEditor
          value={step.script ?? ''}
          autoHeight
          onChange={(value) => dispatch(apiDesignerActions.updateWorkflowStep(step.id, { script: value }))}
        />
      </CodeEditorShell>
    </div>
  )
}
