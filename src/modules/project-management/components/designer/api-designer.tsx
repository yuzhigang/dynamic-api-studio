import { ApiDesignerLayout } from '@/modules/project-management/components/designer/api-designer-layout'
import { ApiDesignerToolbar } from '@/modules/project-management/components/designer/api-designer-toolbar'
import { ApiDesignerProvider } from '@/modules/project-management/state/api-designer-context'
import { LeftDesignPanel } from '@/modules/project-management/components/designer/left-design-panel'
import { WorkflowPanel } from '@/modules/project-management/components/designer/workflow-panel'
import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

type ApiDesignerProps = {
  initialApiDefinition: ApiDefinitionDraft
}

export function ApiDesigner({ initialApiDefinition }: ApiDesignerProps) {
  return (
    <ApiDesignerProvider initialApiDefinition={initialApiDefinition}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-4">
          <ApiDesignerToolbar />
        </div>
        <ApiDesignerLayout left={<LeftDesignPanel />} workflow={<WorkflowPanel />} />
      </div>
    </ApiDesignerProvider>
  )
}
