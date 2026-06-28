import type { ApiDesignerAction, ApiDesignerState } from '@/modules/project-management/state/api-designer-types'
import { createId } from '@/lib/id'
import type { RequestParam, SchemaField, WorkflowStep } from '@/shared/contracts/api-definition.contract'

function createRequestParam(location: RequestParam['location']): RequestParam {
  return {
    id: createId('param'),
    name: '',
    location,
    type: 'string',
    required: false,
    example: '',
    description: '',
  }
}

function createSchemaField(): SchemaField {
  return {
    id: createId('schema'),
    name: 'newField',
    type: 'string',
    required: false,
    description: '',
  }
}

function createWorkflowStep(kind: WorkflowStep['kind']): WorkflowStep {
  const commonFields = {
    id: createId('step'),
    kind,
    resultVariable: 'result',
  }

  return kind === 'sql-query'
    ? { ...commonFields, title: 'SQL 查询', sql: '' }
    : { ...commonFields, title: 'JavaScript 转换', script: '' }
}

function updateSchemaFields(
  fields: SchemaField[],
  id: string,
  patch: Partial<SchemaField>,
): SchemaField[] {
  return fields.map((field) => {
    if (field.id === id) {
      return { ...field, ...patch }
    }

    if (field.children?.length) {
      return { ...field, children: updateSchemaFields(field.children, id, patch) }
    }

    return field
  })
}

function addSchemaChild(fields: SchemaField[], parentId: string): SchemaField[] {
  return fields.map((field) => {
    if (field.id === parentId) {
      return { ...field, children: [...(field.children ?? []), createSchemaField()] }
    }

    if (field.children?.length) {
      return { ...field, children: addSchemaChild(field.children, parentId) }
    }

    return field
  })
}

function addSchemaSibling(fields: SchemaField[], id: string): SchemaField[] {
  return fields.flatMap((field) => {
    if (field.id === id) {
      return [field, createSchemaField()]
    }

    if (field.children?.length) {
      return [{ ...field, children: addSchemaSibling(field.children, id) }]
    }

    return [field]
  })
}

function cloneSchemaField(field: SchemaField): SchemaField {
  return {
    ...field,
    id: createId('schema'),
    ...(field.children ? { children: field.children.map(cloneSchemaField) } : {}),
  }
}

function copySchemaField(fields: SchemaField[], id: string): SchemaField[] {
  return fields.flatMap((field) => {
    if (field.id === id) {
      return [field, cloneSchemaField(field)]
    }

    if (field.children?.length) {
      return [{ ...field, children: copySchemaField(field.children, id) }]
    }

    return [field]
  })
}

function removeSchemaField(fields: SchemaField[], id: string): SchemaField[] {
  return fields
    .filter((field) => field.id !== id)
    .map((field) =>
      field.children?.length
        ? { ...field, children: removeSchemaField(field.children, id) }
        : field,
    )
}

function insertWorkflowStep(
  steps: WorkflowStep[],
  afterId: string,
  step: WorkflowStep,
): WorkflowStep[] {
  const sourceIndex = steps.findIndex((item) => item.id === afterId)

  if (sourceIndex === -1) {
    return [...steps, step]
  }

  return [...steps.slice(0, sourceIndex + 1), step, ...steps.slice(sourceIndex + 1)]
}

export function apiDesignerReducer(
  state: ApiDesignerState,
  action: ApiDesignerAction,
): ApiDesignerState {
  switch (action.type) {
    case 'update-api-field':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          [action.field]: action.value,
        },
      }
    case 'set-tags':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          tags: action.value,
        },
      }
    case 'set-permissions':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          permissions: action.value,
        },
      }
    case 'update-request-param':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          requestParams: state.apiDefinition.requestParams.map((param) =>
            param.id === action.id ? { ...param, ...action.patch } : param,
          ),
        },
      }
    case 'add-request-param': {
      const params = state.apiDefinition.requestParams
      const newParam = createRequestParam(action.location)
      const sourceIndex = action.afterId
        ? params.findIndex((param) => param.id === action.afterId)
        : -1
      const nextParams =
        sourceIndex === -1
          ? [...params, newParam]
          : [...params.slice(0, sourceIndex + 1), newParam, ...params.slice(sourceIndex + 1)]

      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          requestParams: nextParams,
        },
      }
    }
    case 'remove-request-param':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          requestParams: state.apiDefinition.requestParams.filter((param) => param.id !== action.id),
        },
      }
    case 'update-schema-field':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          responseSchema: updateSchemaFields(state.apiDefinition.responseSchema, action.id, action.patch),
        },
      }
    case 'add-schema-field':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          responseSchema: [...state.apiDefinition.responseSchema, createSchemaField()],
        },
      }
    case 'add-schema-child':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          responseSchema: addSchemaChild(state.apiDefinition.responseSchema, action.parentId),
        },
      }
    case 'add-schema-sibling':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          responseSchema: addSchemaSibling(state.apiDefinition.responseSchema, action.id),
        },
      }
    case 'copy-schema-field':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          responseSchema: copySchemaField(state.apiDefinition.responseSchema, action.id),
        },
      }
    case 'remove-schema-field':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          responseSchema: removeSchemaField(state.apiDefinition.responseSchema, action.id),
        },
      }
    case 'update-workflow-step':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          workflowSteps: state.apiDefinition.workflowSteps.map((step) =>
            step.id === action.id ? { ...step, ...action.patch } : step,
          ),
        },
      }
    case 'add-workflow-step':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          workflowSteps: insertWorkflowStep(
            state.apiDefinition.workflowSteps,
            action.afterId,
            createWorkflowStep(action.kind),
          ),
        },
      }
    case 'copy-workflow-step': {
      const source = state.apiDefinition.workflowSteps.find((step) => step.id === action.id)

      if (!source) {
        return state
      }

      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          workflowSteps: insertWorkflowStep(state.apiDefinition.workflowSteps, action.id, {
            ...source,
            id: createId('step'),
            title: `${source.title}副本`,
          }),
        },
      }
    }
    case 'remove-workflow-step':
      return {
        ...state,
        apiDefinition: {
          ...state.apiDefinition,
          workflowSteps: state.apiDefinition.workflowSteps.filter((step) => step.id !== action.id),
        },
      }
    case 'set-test-param':
      return {
        ...state,
        testParams: {
          ...state.testParams,
          [action.name]: action.value,
        },
      }
    case 'set-test-result':
      return {
        ...state,
        testResult: action.result,
      }
    default:
      return state
  }
}
