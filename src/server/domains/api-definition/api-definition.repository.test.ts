import { beforeAll, describe, expect, it } from 'vitest'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import { apiDefinitionDraftSchema } from '@/shared/contracts/api-definition.contract'

describe('ApiDefinitionRepository published lookups', () => {
  const repository = new ApiDefinitionRepository(platformDb)

  beforeAll(async () => {
    if (dbAvailable) await seedDemoData(platformDb)
  })

  it.skipIf(!dbAvailable)('listPublished returns only published drafts', async () => {
    const published = await repository.listPublished()
    expect(published.every((d) => d.status === 'published')).toBe(true)
    // 用子集而非精确相等：容忍 project-api.route.test 在并行 worker 中经路由提交的测试 api 尚未被 afterAll 清理。
    const publishedIds = published.map((d) => d.id)
    expect(
      ['api_order_detail', 'api_order_query', 'api_product_query', 'api_report_internal'].every((id) =>
        publishedIds.includes(id),
      ),
    ).toBe(true)
  })

  it.skipIf(!dbAvailable)('isPathMethodUnique is false for an existing published (path, method)', async () => {
    expect(await repository.isPathMethodUnique('/api/v1/order/query', 'POST')).toBe(false)
  })

  it.skipIf(!dbAvailable)('isPathMethodUnique is true when excluding the conflicting def itself', async () => {
    expect(await repository.isPathMethodUnique('/api/v1/order/query', 'POST', 'api_order_query')).toBe(true)
  })

  it.skipIf(!dbAvailable)('isPathMethodUnique is true for a brand new path', async () => {
    expect(await repository.isPathMethodUnique('/api/v1/brand/new', 'POST')).toBe(true)
  })

  it.skipIf(!dbAvailable)('published seed demos are requireAuth=false (open) and schema defaults requireAuth=true', async () => {
    const published = await repository.listPublished()
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