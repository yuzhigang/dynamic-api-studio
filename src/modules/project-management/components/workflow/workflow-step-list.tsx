import { JsTransformStepCard } from '@/modules/project-management/components/workflow/js-transform-step-card'
import { SqlQueryStepCard } from '@/modules/project-management/components/workflow/sql-query-step-card'
import { WorkflowStepCard } from '@/modules/project-management/components/workflow/workflow-step-card'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
import { assertNever } from '@/shared/utils/assert-never'

export function WorkflowStepList() {
  const { state } = useApiDesigner()

  return (
    <div className="space-y-3">
      {state.apiDefinition.workflowSteps.map((step, index) => (
        <WorkflowStepCard
          key={step.id}
          stepId={step.id}
          index={index}
          title={step.title}
          role={step.role}
        >
          {step.kind === 'sql-query' ? <SqlQueryStepCard step={step} /> : null}
          {step.kind === 'js-transform' ? <JsTransformStepCard step={step} /> : null}
          {step.kind !== 'sql-query' && step.kind !== 'js-transform' ? assertNever(step.kind) : null}
        </WorkflowStepCard>
      ))}
    </div>
  )
}
