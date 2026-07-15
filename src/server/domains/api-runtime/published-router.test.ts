import { describe, expect, it } from 'vitest'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { rebuildPublishedRouter, getPublishedApp } from '@/server/domains/api-runtime/published-router'
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

function publishedDef(path: string, script: string): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'published', name: path, path, method: 'GET',
    tags: [], permissions: [], bodyContentType: 'json',
    requestParams: [], responseSchema: [], localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script }],
  } as ApiDefinitionDraft
}

describe('published-router', () => {
  it('serves a published route and 404s an unknown path', async () => {
    const repo = new ApiDefinitionRepository()
    repo.save('p1', publishedDef('/api/v1/rt/a', 'return { ok: "a" }'))
    rebuildPublishedRouter(deps, services, repo)

    const app = getPublishedApp()
    const ok = await app.request('/api/v1/rt/a')
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ ok: 'a' })

    const missing = await app.request('/api/v1/does-not-exist')
    expect(missing.status).toBe(404)
  })

  it('rebuild reflects a newly published def', async () => {
    const repo = new ApiDefinitionRepository()
    rebuildPublishedRouter(deps, services, repo)
    expect((await getPublishedApp().request('/api/v1/rt/b')).status).toBe(404)

    repo.save('p1', publishedDef('/api/v1/rt/b', 'return { ok: "b" }'))
    rebuildPublishedRouter(deps, services, repo)
    const res = await getPublishedApp().request('/api/v1/rt/b')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: 'b' })
  })

  it('serves the OpenAPI doc at /api/openapi with the published path', async () => {
    const repo = new ApiDefinitionRepository()
    repo.save('p1', publishedDef('/api/v1/rt/c', 'return 1'))
    rebuildPublishedRouter(deps, services, repo)
    const doc = await getPublishedApp().request('/api/openapi')
    expect(doc.status).toBe(200)
    const json = await doc.json() as { paths: Record<string, unknown> }
    expect(json.paths).toHaveProperty('/api/v1/rt/c')
  })
})