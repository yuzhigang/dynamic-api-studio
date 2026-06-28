import { describe, expect, it } from 'vitest'

import { projectDraftSchema, projectSchema } from '@/shared/contracts/project.contract'

describe('project schemas', () => {
  it('validates an active project', () => {
    expect(
      projectSchema.parse({
        id: 'project_order',
        code: 'ORDER',
        name: '订单中心',
        description: '订单相关动态 API',
        status: 'active',
        apiCount: 2,
        createdAt: '2026-06-27T00:00:00.000Z',
        updatedAt: '2026-06-27T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'project_order',
      code: 'ORDER',
      name: '订单中心',
      status: 'active',
    })
  })

  it('rejects project drafts without code or name', () => {
    expect(() => projectDraftSchema.parse({ code: '', name: '' })).toThrow()
  })
})
