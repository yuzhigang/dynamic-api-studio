import type {
  ApiDefinitionDraft,
  ApiTestResult,
  RequestParam,
  SchemaField,
  WorkflowStep,
} from '@/shared/contracts/api-definition.contract'

export type ApiDesignerState = {
  apiDefinition: ApiDefinitionDraft
  testParams: Record<string, string>
  testResult: ApiTestResult | null
}

export type ApiDesignerAction =
  | {
      type: 'update-api-field'
      field: keyof Pick<
        ApiDefinitionDraft,
        'id' | 'name' | 'path' | 'method' | 'description' | 'bodyContentType' | 'status'
      >
      value: string
    }
  | { type: 'set-tags'; value: string[] }
  | { type: 'set-permissions'; value: string[] }
  | { type: 'set-require-auth'; value: boolean }
  | { type: 'update-request-param'; id: string; patch: Partial<RequestParam> }
  | { type: 'add-request-param'; location: RequestParam['location']; afterId?: string }
  | { type: 'remove-request-param'; id: string }
  | { type: 'update-schema-field'; id: string; patch: Partial<SchemaField> }
  | { type: 'add-schema-field' }
  | { type: 'add-schema-child'; parentId: string }
  | { type: 'add-schema-sibling'; id: string }
  | { type: 'copy-schema-field'; id: string }
  | { type: 'remove-schema-field'; id: string }
  | { type: 'update-workflow-step'; id: string; patch: Partial<WorkflowStep> }
  | { type: 'add-workflow-step'; afterId: string; kind: WorkflowStep['kind'] }
  | { type: 'copy-workflow-step'; id: string }
  | { type: 'remove-workflow-step'; id: string }
  | { type: 'set-test-param'; name: string; value: string }
  | { type: 'set-test-result'; result: ApiTestResult | null }
