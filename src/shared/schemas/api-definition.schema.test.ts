import { describe, expect, it } from 'vitest'

import { createEmptyApiDefinition } from '@/shared/api-definition/create-empty-api-definition'
import { apiDefinitionDraftSchema } from '@/shared/contracts/api-definition.contract'

describe('apiDefinitionDraftSchema', () => {
  it('requires projectId', () => {
    const draft = createEmptyApiDefinition({ projectId: 'project_order' })

    expect(apiDefinitionDraftSchema.parse(draft).projectId).toBe('project_order')
    expect(() => apiDefinitionDraftSchema.parse({ ...draft, projectId: '' })).toThrow()
  })

  it('preserves the requested lifecycle status', () => {
    const draft = createEmptyApiDefinition({
      projectId: 'project_order',
      status: 'published',
    })

    expect(apiDefinitionDraftSchema.parse(draft).status).toBe('published')
  })

  it('validates api with local variables and step output', () => {
    const draft = createEmptyApiDefinition({ projectId: 'project_order' })
    const result = apiDefinitionDraftSchema.safeParse({
      ...draft,
      localVariables: [
        {
          id: 'v1',
          name: 'offset',
          type: 'integer',
          mode: 'required',
          value: { kind: 'expression', expression: '($input.pageSize - 1) * $input.pageNo' },
        },
      ],
      workflowSteps: [
        {
          ...draft.workflowSteps[0],
          outputVariable: 'orders',
          condition: '$input.sync != null',
        },
      ],
    })
    expect(result.success).toBe(true)
  })
})
