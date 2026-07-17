import type { ApiDesignerAction } from '@/modules/project-management/state/api-designer-types'
import type {
  ApiDefinitionDraft,
  ApiTestResult,
  RequestParam,
  SchemaField,
  WorkflowStep,
} from '@/shared/contracts/api-definition.contract'

export const apiDesignerActions = {
  updateApiField(
    field: keyof Pick<
      ApiDefinitionDraft,
      'id' | 'name' | 'path' | 'method' | 'description' | 'bodyContentType' | 'status'
    >,
    value: string,
  ): ApiDesignerAction {
    return { type: 'update-api-field', field, value }
  },
  setTags(value: string[]): ApiDesignerAction {
    return { type: 'set-tags', value }
  },
  setPermissions(value: string[]): ApiDesignerAction {
    return { type: 'set-permissions', value }
  },
  setRequireAuth(value: boolean): ApiDesignerAction {
    return { type: 'set-require-auth', value }
  },
  updateRequestParam(id: string, patch: Partial<RequestParam>): ApiDesignerAction {
    return { type: 'update-request-param', id, patch }
  },
  addRequestParam(location: RequestParam['location'], afterId?: string): ApiDesignerAction {
    return { type: 'add-request-param', location, afterId }
  },
  removeRequestParam(id: string): ApiDesignerAction {
    return { type: 'remove-request-param', id }
  },
  updateSchemaField(id: string, patch: Partial<SchemaField>): ApiDesignerAction {
    return { type: 'update-schema-field', id, patch }
  },
  addSchemaField(): ApiDesignerAction {
    return { type: 'add-schema-field' }
  },
  addSchemaChild(parentId: string): ApiDesignerAction {
    return { type: 'add-schema-child', parentId }
  },
  addSchemaSibling(id: string): ApiDesignerAction {
    return { type: 'add-schema-sibling', id }
  },
  copySchemaField(id: string): ApiDesignerAction {
    return { type: 'copy-schema-field', id }
  },
  removeSchemaField(id: string): ApiDesignerAction {
    return { type: 'remove-schema-field', id }
  },
  updateWorkflowStep(id: string, patch: Partial<WorkflowStep>): ApiDesignerAction {
    return { type: 'update-workflow-step', id, patch }
  },
  addWorkflowStep(afterId: string, kind: WorkflowStep['kind']): ApiDesignerAction {
    return { type: 'add-workflow-step', afterId, kind }
  },
  copyWorkflowStep(id: string): ApiDesignerAction {
    return { type: 'copy-workflow-step', id }
  },
  removeWorkflowStep(id: string): ApiDesignerAction {
    return { type: 'remove-workflow-step', id }
  },
  setTestParam(name: string, value: string): ApiDesignerAction {
    return { type: 'set-test-param', name, value }
  },
  setTestResult(result: ApiTestResult | null): ApiDesignerAction {
    return { type: 'set-test-result', result }
  },
}
