import { useParams } from '@tanstack/react-router'

import { ApiDesigner } from '@/modules/projects/components/designer/api-designer'
import { createEmptyApiDefinition } from '@/shared/api-definition/create-empty-api-definition'

export function CreateApiPage() {
  const { projectId = 'project_order' } = useParams({ strict: false }) as { projectId?: string }

  return <ApiDesigner initialApiDefinition={createEmptyApiDefinition({ projectId })} />
}
