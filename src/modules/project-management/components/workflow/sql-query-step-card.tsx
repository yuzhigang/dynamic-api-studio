import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { CodeEditorShell } from '@/components/editors/code-editor-shell'
import { JavascriptEditor } from '@/components/editors/javascript-editor'
import { SqlEditor } from '@/components/editors/sql-editor'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/project-management/state/api-designer-actions'
import { buildSymbolStore } from '@/components/editors/build-symbol-store'
import { ResultVariableInput } from '@/modules/project-management/components/workflow/result-variable-input'
import { StepDatasourceSelect } from '@/modules/project-management/components/workflow/step-datasource-select'
import type { WorkflowStep } from '@/shared/contracts/api-definition.contract'

type SqlQueryStepCardProps = {
  step: WorkflowStep
}

export function SqlQueryStepCard({ step }: SqlQueryStepCardProps) {
  const { state, dispatch } = useApiDesigner()
  const symbols = buildSymbolStore(state.apiDefinition, step.id)

  const [sqlExpanded, setSqlExpanded] = useState(true)
  const [scriptExpanded, setScriptExpanded] = useState(false)
  const [maximizedEditor, setMaximizedEditor] = useState<'sql' | 'js' | null>(null)

  return (
    <>
      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-3 text-xs text-slate-700">
        <span className="font-medium">数据源</span>
        <StepDatasourceSelect
          value={step.datasourceId}
          onChange={(value) => dispatch(apiDesignerActions.updateWorkflowStep(step.id, { datasourceId: value }))}
        />
        <span className="font-medium">变量名称</span>
        <ResultVariableInput
          value={step.resultVariable}
          onChange={(value) =>
            dispatch(apiDesignerActions.updateWorkflowStep(step.id, { resultVariable: value }))
          }
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${step.id}-multiple-rows`}
            checked={step.multipleRows}
            onCheckedChange={(checked) =>
              dispatch(apiDesignerActions.updateWorkflowStep(step.id, { multipleRows: checked === true }))
            }
          />
          <label htmlFor={`${step.id}-multiple-rows`} className="font-medium">多行返回值</label>
        </div>
      </div>
      <div>
        <CodeEditorShell
          title="SQL 语句"
          maxHeight={240}
          collapsible
          expanded={sqlExpanded}
          onExpandedChange={setSqlExpanded}
          onMaximize={() => setMaximizedEditor('sql')}
        >
          <SqlEditor
            value={step.sql ?? ''}
            symbols={symbols}
            autoHeight
            onChange={(value) => dispatch(apiDesignerActions.updateWorkflowStep(step.id, { sql: value }))}
          />
        </CodeEditorShell>
      </div>
      <div>
        <CodeEditorShell
          title="转换语句（JS）"
          maxHeight={200}
          collapsible
          defaultExpanded={false}
          expanded={scriptExpanded}
          onExpandedChange={setScriptExpanded}
          onMaximize={() => setMaximizedEditor('js')}
        >
          <JavascriptEditor
            value={step.script ?? ''}
            autoHeight
            onChange={(value) => dispatch(apiDesignerActions.updateWorkflowStep(step.id, { script: value }))}
          />
        </CodeEditorShell>
        {scriptExpanded ? (
          <p className="mt-1 text-[11px] text-slate-400">
            可选。使用 <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">data</code>{' '}
            接收上一步 SQL 查询结果，<code className="rounded bg-slate-100 px-1 font-mono text-[11px]">return</code>{' '}
            转换后的数据。
          </p>
        ) : null}
      </div>

      <Dialog open={maximizedEditor === 'sql'} onOpenChange={() => setMaximizedEditor(null)}>
        <DialogContent className="flex h-[60vh] max-w-5xl flex-col p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-base">编辑 SQL 语句</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 px-6 pb-6">
            <CodeEditorShell flex className="h-full">
              <SqlEditor
                value={step.sql ?? ''}
                symbols={symbols}
                autoHeight
                onChange={(value) => dispatch(apiDesignerActions.updateWorkflowStep(step.id, { sql: value }))}
              />
            </CodeEditorShell>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={maximizedEditor === 'js'} onOpenChange={() => setMaximizedEditor(null)}>
        <DialogContent className="flex h-[80vh] max-w-5xl flex-col p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-base">编辑转换语句（JS）</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 px-6 pb-6">
            <CodeEditorShell flex className="h-full">
              <JavascriptEditor
                value={step.script ?? ''}
                autoHeight
                onChange={(value) => dispatch(apiDesignerActions.updateWorkflowStep(step.id, { script: value }))}
              />
            </CodeEditorShell>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
