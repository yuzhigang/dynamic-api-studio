import type { PropsWithChildren } from 'react'

import { WorkflowStepToolbar } from '@/modules/project-management/components/workflow/workflow-step-toolbar'
import type { WorkflowStep } from '@/shared/contracts/api-definition.contract'

type WorkflowStepCardProps = PropsWithChildren<{
  stepId: string
  index: number
  title: string
  role?: WorkflowStep['role']
}>

export function WorkflowStepCard({ stepId, index, title, role, children }: WorkflowStepCardProps) {
  const isAssemble = role === 'assemble'

  return (
    <article className="rounded-md border border-slate-200 bg-white shadow-panel">
      <header className="flex h-10 items-center justify-between border-b border-slate-100 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            步骤 {index + 1} - {title}
          </h3>
          {isAssemble ? (
            <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
              组装步骤
            </span>
          ) : null}
        </div>
        <WorkflowStepToolbar stepId={stepId} stepTitle={title} isAssemble={isAssemble} />
      </header>
      <div className="space-y-3 p-3">{children}</div>
    </article>
  )
}
