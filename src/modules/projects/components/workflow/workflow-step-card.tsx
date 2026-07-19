import { useState, type PropsWithChildren } from 'react'

import { ChevronDown } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { WorkflowStepToolbar } from '@/modules/projects/components/workflow/workflow-step-toolbar'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/projects/state/api-designer-actions'
import type { WorkflowStep } from '@/shared/contracts/api-definition.contract'

type WorkflowStepCardProps = PropsWithChildren<{
  step: WorkflowStep
  index: number
}>

export function WorkflowStepCard({ step, index, children }: WorkflowStepCardProps) {
  const { dispatch } = useApiDesigner()
  const [conditionExpanded, setConditionExpanded] = useState(Boolean(step.condition))
  const isAssemble = step.role === 'assemble'
  const hasCondition = Boolean(step.condition)

  return (
    <article className="rounded-md border border-slate-200 bg-white shadow-panel">
      <header className="flex h-10 items-center justify-between border-b border-slate-100 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            步骤 {index + 1} - {step.title}
          </h3>
          {hasCondition ? (
            <span className="shrink-0 rounded-sm bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600">
              有条件
            </span>
          ) : null}
          {isAssemble ? (
            <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
              组装步骤
            </span>
          ) : null}
        </div>
        <WorkflowStepToolbar stepId={step.id} stepTitle={step.title} isAssemble={isAssemble} />
      </header>
      <div className="space-y-3 p-3">
        {isAssemble ? null : (
          <div className="rounded border border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={() => setConditionExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <span>执行条件（可选）</span>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform ${conditionExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {conditionExpanded ? (
              <div className="border-t border-slate-100 p-3">
                <Textarea
                  id={`${step.id}-condition`}
                  value={step.condition ?? ''}
                  placeholder="条件为真时执行，如 $input.enabled || $.isAdmin"
                  className="min-h-[60px] resize-y bg-white text-xs"
                  onChange={(event) => {
                    const value = event.target.value.trim()
                    dispatch(
                      apiDesignerActions.updateWorkflowStep(step.id, {
                        condition: value || undefined,
                      }),
                    )
                  }}
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  支持 JavaScript 表达式，可引用 $input、$global、$local 等变量。
                </p>
              </div>
            ) : null}
          </div>
        )}
        {children}
      </div>
    </article>
  )
}
