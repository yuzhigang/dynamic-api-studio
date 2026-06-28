import type { PropsWithChildren } from 'react'

import { WorkflowStepToolbar } from '@/modules/project-management/components/workflow/workflow-step-toolbar'

type WorkflowStepCardProps = PropsWithChildren<{
  stepId: string
  index: number
  title: string
}>

export function WorkflowStepCard({ stepId, index, title, children }: WorkflowStepCardProps) {
  return (
    <article className="rounded-md border border-slate-200 bg-white shadow-panel">
      <header className="flex h-10 items-center justify-between border-b border-slate-100 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            步骤 {index + 1} - {title}
          </h3>
        </div>
        <WorkflowStepToolbar stepId={stepId} stepTitle={title} />
      </header>
      <div className="space-y-3 p-3">{children}</div>
    </article>
  )
}
