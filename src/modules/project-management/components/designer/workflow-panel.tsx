import { WorkflowStepList } from '@/modules/project-management/components/workflow/workflow-step-list'

export function WorkflowPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center px-4">
        <h2 className="text-sm font-semibold text-foreground">工作流步骤</h2>
      </div>
      <div className="hover-scroll min-h-0 flex-1 overflow-y-auto p-3">
        <WorkflowStepList />
      </div>
    </div>
  )
}
