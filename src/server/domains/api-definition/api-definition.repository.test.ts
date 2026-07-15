import { describe, expect, it } from 'vitest'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { apiDefinitionDraftSchema } from '@/shared/contracts/api-definition.contract'

describe('ApiDefinitionRepository published lookups', () => {
  const repository = new ApiDefinitionRepository()

  it('listPublished returns only published drafts', () => {
    const published = repository.listPublished()
    expect(published.every((d) => d.status === 'published')).toBe(true)
    expect(published.map((d) => d.id).sort()).toEqual(
      ['api_order_detail', 'api_order_query', 'api_product_query', 'api_report_internal'].sort(),
    )
  })

  it('isPathMethodUnique is false for an existing published (path, method)', () => {
    expect(repository.isPathMethodUnique('/api/v1/order/query', 'POST')).toBe(false)
  })

  it('isPathMethodUnique is true when excluding the conflicting def itself', () => {
    expect(repository.isPathMethodUnique('/api/v1/order/query', 'POST', 'api_order_query')).toBe(true)
  })

  it('isPathMethodUnique is true for a brand new path', () => {
    expect(repository.isPathMethodUnique('/api/v1/brand/new', 'POST')).toBe(true)
  })

  it('published seed demos are requireAuth=false (open) and schema defaults requireAuth=true', () => {
    const published = repository.listPublished()
    for (const d of published) {
      expect(d.requireAuth).toBe(false)
    }
    const parsed = apiDefinitionDraftSchema.parse({
      projectId: 'p', status: 'draft', name: 'n', path: '/x', method: 'GET',
      tags: [], permissions: [], bodyContentType: 'json', requestParams: [], responseSchema: [],
      localVariables: [], workflowSteps: [],
    })
    expect(parsed.requireAuth).toBe(true)
  })
})