import { JsTransformStepCard } from '@/modules/projects/components/workflow/js-transform-step-card'
import { SqlQueryStepCard } from '@/modules/projects/components/workflow/sql-query-step-card'
import { WorkflowStepCard } from '@/modules/projects/components/workflow/workflow-step-card'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'
import { assertNever } from '@/shared/utils/assert-never'

export function WorkflowStepList() {
  const { state } = useApiDesigner()

  return (
    <div className="space-y-3">
      {state.apiDefinition.workflowSteps.map((step, index) => (
        <WorkflowStepCard
          key={step.id}
          step={step}
          index={index}
        >
          {step.kind === 'sql-query' ? <SqlQueryStepCard step={step} /> : null}
          {step.kind === 'js-transform' ? <JsTransformStepCard step={step} /> : null}
          {step.kind !== 'sql-query' && step.kind !== 'js-transform' ? assertNever(step.kind) : null}
        </WorkflowStepCard>
      ))}
    </div>
  )
}
