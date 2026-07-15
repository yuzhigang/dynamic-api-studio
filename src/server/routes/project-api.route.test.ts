import { describe, expect, it } from 'vitest'
import { projectApiRoute } from '@/server/routes/project-api.route'
import { getPublishedApp } from '@/server/domains/api-runtime/published-router'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function publishedDef(path: string): ApiDefinitionDraft {
  return {
    projectId: 'project_order', status: 'published', name: path, path, method: 'GET',
    tags: [], permissions: [], bodyContentType: 'json',
    requestParams: [], responseSchema: [], localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return { ok: true }' }],
  } as ApiDefinitionDraft
}

describe('project-api route + published dispatch', () => {
  it('save publishes a callable route and 409s on path+method collision', async () => {
    const a = await projectApiRoute.request('/project_order/apis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...publishedDef('/api/v1/rt/unique1'), projectId: 'project_order' }),
    })
    expect(a.status).toBe(200)

    const live = await getPublishedApp().request('/api/v1/rt/unique1')
    expect(live.status).toBe(200)

    const b = await projectApiRoute.request('/project_order/apis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...publishedDef('/api/v1/rt/unique1'), projectId: 'project_order', name: 'collision' }),
    })
    expect(b.status).toBe(409)
  })
})