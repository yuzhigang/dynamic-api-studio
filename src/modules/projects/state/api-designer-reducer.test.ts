import { describe, expect, it } from 'vitest'

import { apiDesignerActions } from '@/modules/projects/state/api-designer-actions'
import { apiDesignerReducer } from '@/modules/projects/state/api-designer-reducer'
import type { ApiDesignerState } from '@/modules/projects/state/api-designer-types'
import { createEmptyApiDefinition } from '@/shared/api-definition/create-empty-api-definition'
import type { SchemaField } from '@/shared/contracts/api-definition.contract'

function createState(): ApiDesignerState {
  return {
    apiDefinition: createEmptyApiDefinition(),
    testParams: {},
    testResult: null,
  }
}

function collectSchemaIds(field: SchemaField): string[] {
  return [field.id, ...(field.children?.flatMap(collectSchemaIds) ?? [])]
}

function omitSchemaIds(field: SchemaField): Omit<SchemaField, 'id' | 'children'> & { children?: unknown[] } {
  return {
    name: field.name,
    type: field.type,
    required: field.required,
    ...(field.description === undefined ? {} : { description: field.description }),
    ...(field.children ? { children: field.children.map(omitSchemaIds) } : {}),
  }
}

describe('apiDesignerReducer workflow commands', () => {
  it('adds the requested workflow step immediately after the existing step', () => {
    const state = createState()
    const existingIds = state.apiDefinition.workflowSteps.map((step) => step.id)

    const nextState = apiDesignerReducer(
      state,
      apiDesignerActions.addWorkflowStep('step_order_main', 'js-transform'),
    )

    expect(nextState.apiDefinition.workflowSteps.map((step) => step.id)).toEqual([
      existingIds[0],
      expect.stringMatching(/^step_/),
      ...existingIds.slice(1),
    ])
    expect(nextState.apiDefinition.workflowSteps[1]).toMatchObject({
      kind: 'js-transform',
      title: 'JavaScript 转换',
    })
    expect(existingIds).not.toContain(nextState.apiDefinition.workflowSteps[1].id)
  })

  it('copies a workflow step after the source with a fresh ID and copy suffix', () => {
    const state = createState()
    const source = state.apiDefinition.workflowSteps[0]

    const nextState = apiDesignerReducer(state, apiDesignerActions.copyWorkflowStep(source.id))
    const copy = nextState.apiDefinition.workflowSteps[1]

    expect(nextState.apiDefinition.workflowSteps[0]).toBe(source)
    expect(copy).toEqual({ ...source, id: copy.id, title: `${source.title}副本` })
    expect(copy.id).not.toBe(source.id)
  })

  it('removes a workflow step without changing the remaining order', () => {
    const state = createState()

    const nextState = apiDesignerReducer(
      state,
      apiDesignerActions.removeWorkflowStep('step_order_detail'),
    )

    expect(nextState.apiDefinition.workflowSteps.map((step) => step.id)).toEqual([
      'step_order_main',
      'step_product',
      'step_assemble',
    ])
  })

  it('sets requireAuth on the API definition', () => {
    const state = createState()

    expect(state.apiDefinition.requireAuth).toBe(true)

    const nextState = apiDesignerReducer(
      state,
      apiDesignerActions.setRequireAuth(false),
    )

    expect(nextState.apiDefinition.requireAuth).toBe(false)
  })

  it('sets a condition on a workflow step', () => {
    const state = createState()
    const stepId = state.apiDefinition.workflowSteps[0].id

    const nextState = apiDesignerReducer(
      state,
      apiDesignerActions.updateWorkflowStep(stepId, {
        condition: '$input.enabled || $.isAdmin',
      }),
    )

    const step = nextState.apiDefinition.workflowSteps.find((item) => item.id === stepId)
    expect(step?.condition).toBe('$input.enabled || $.isAdmin')
  })

  it('clears a workflow step condition when set to undefined', () => {
    const state = createState()
    const stepId = state.apiDefinition.workflowSteps[0].id

    const withCondition = apiDesignerReducer(
      state,
      apiDesignerActions.updateWorkflowStep(stepId, {
        condition: '$input.enabled',
      }),
    )

    const cleared = apiDesignerReducer(
      withCondition,
      apiDesignerActions.updateWorkflowStep(stepId, {
        condition: undefined,
      }),
    )

    const step = cleared.apiDefinition.workflowSteps.find((item) => item.id === stepId)
    expect(step?.condition).toBeUndefined()
  })
})

describe('apiDesignerReducer schema commands', () => {
  it('appends a new root field with a fresh ID', () => {
    const state = createState()
    const existingIds = state.apiDefinition.responseSchema.map((field) => field.id)

    const nextState = apiDesignerReducer(state, apiDesignerActions.addSchemaField())
    const addedField = nextState.apiDefinition.responseSchema.at(-1)

    expect(nextState.apiDefinition.responseSchema.slice(0, -1)).toEqual(
      state.apiDefinition.responseSchema,
    )
    expect(addedField).toMatchObject({
      id: expect.stringMatching(/^schema_/),
      name: 'newField',
      type: 'string',
      required: false,
    })
    expect(existingIds).not.toContain(addedField?.id)
  })

  it('appends a child to a nested parent while preserving the tree order', () => {
    const state = createState()

    const nextState = apiDesignerReducer(
      state,
      apiDesignerActions.addSchemaChild('schema_data_list'),
    )
    const dataField = nextState.apiDefinition.responseSchema[2]
    const listField = dataField.children?.[0]
    const addedChild = listField?.children?.at(-1)

    expect(nextState.apiDefinition.responseSchema.slice(0, 2)).toEqual(
      state.apiDefinition.responseSchema.slice(0, 2),
    )
    expect(listField?.children?.slice(0, -1)).toEqual(
      state.apiDefinition.responseSchema[2].children?.[0].children,
    )
    expect(addedChild).toMatchObject({
      id: expect.stringMatching(/^schema_/),
      name: 'newField',
      type: 'string',
      required: false,
    })
  })

  it('deeply copies a schema field after the source with fresh recursive IDs', () => {
    const state = createState()
    const source = state.apiDefinition.responseSchema[2]

    const nextState = apiDesignerReducer(state, apiDesignerActions.copySchemaField(source.id))
    const copy = nextState.apiDefinition.responseSchema[3]
    const sourceIds = collectSchemaIds(source)
    const copyIds = collectSchemaIds(copy)

    expect(nextState.apiDefinition.responseSchema.slice(0, 3)).toEqual(
      state.apiDefinition.responseSchema,
    )
    expect(omitSchemaIds(copy)).toEqual(omitSchemaIds(source))
    expect(copyIds).toHaveLength(sourceIds.length)
    expect(copyIds.every((id) => !sourceIds.includes(id))).toBe(true)
    expect(new Set(copyIds).size).toBe(copyIds.length)
  })

  it('recursively removes a nested field and its descendants', () => {
    const state = createState()

    const nextState = apiDesignerReducer(
      state,
      apiDesignerActions.removeSchemaField('schema_data_list'),
    )

    expect(nextState.apiDefinition.responseSchema.map((field) => field.id)).toEqual([
      'schema_code',
      'schema_msg',
      'schema_data',
    ])
    expect(nextState.apiDefinition.responseSchema[2].children).toEqual([])
    expect(JSON.stringify(nextState.apiDefinition.responseSchema)).not.toContain('schema_order_no')
  })
})
