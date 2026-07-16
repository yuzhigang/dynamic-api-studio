import { beforeAll, describe, expect, it } from 'vitest'
import { rebuildPublishedRouter, getPublishedApp } from '@/server/domains/api-runtime/published-router'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable, withRollback } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

const deps = {
  knexRegistry: {} as never,
  getDataSource: () => undefined,
  analyzer: new EnhancedSqlAnalyzer(),
} as never
const services = {
  globalVariableService: { list: () => [] } as never,
  projectVariableService: { list: () => [] } as never,
} as never
const authDeps = { verifyToken: () => undefined, getPermissions: () => [] } as never

function publishedDef(path: string, script: string): ApiDefinitionDraft {
  return {
    projectId: 'project_order', status: 'published', name: path, path, method: 'GET',
    tags: [], permissions: [], requireAuth: false, bodyContentType: 'json',
    requestParams: [], responseSchema: [], localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script }],
  } as ApiDefinitionDraft
}

// published runtime 依赖平台库（listPublished 走 DB）。无 .env 时整组跳过。
describe.skipIf(!dbAvailable)('published-router', () => {
  beforeAll(async () => {
    await seedDemoData(platformDb)
  })

  it('serves a published route and 404s an unknown path', async () => {
    await withRollback(platformDb, async (trx) => {
      const repo = new ApiDefinitionRepository(trx)
      await repo.save('project_order', publishedDef('/api/v1/rt/a', 'return { ok: "a" }'))
      await rebuildPublishedRouter(deps, services, repo, authDeps)

      const app = getPublishedApp()
      const ok = await app.request('/api/v1/rt/a')
      expect(ok.status).toBe(200)
      expect(await ok.json()).toEqual({ ok: 'a' })

      const missing = await app.request('/api/v1/does-not-exist')
      expect(missing.status).toBe(404)
    })
  })

  it('rebuild reflects a newly published def', async () => {
    await withRollback(platformDb, async (trx) => {
      const repo = new ApiDefinitionRepository(trx)
      await rebuildPublishedRouter(deps, services, repo, authDeps)
      expect((await getPublishedApp().request('/api/v1/rt/b')).status).toBe(404)

      await repo.save('project_order', publishedDef('/api/v1/rt/b', 'return { ok: "b" }'))
      await rebuildPublishedRouter(deps, services, repo, authDeps)
      const res = await getPublishedApp().request('/api/v1/rt/b')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: 'b' })
    })
  })

  it('serves the OpenAPI doc at /api/openapi with the published path', async () => {
    await withRollback(platformDb, async (trx) => {
      const repo = new ApiDefinitionRepository(trx)
      await repo.save('project_order', publishedDef('/api/v1/rt/c', 'return 1'))
      await rebuildPublishedRouter(deps, services, repo, authDeps)
      const doc = await getPublishedApp().request('/api/openapi')
      expect(doc.status).toBe(200)
      const json = (await doc.json()) as { paths: Record<string, unknown> }
      expect(json.paths).toHaveProperty('/api/v1/rt/c')
    })
  })
})