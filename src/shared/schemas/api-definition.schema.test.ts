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
})
