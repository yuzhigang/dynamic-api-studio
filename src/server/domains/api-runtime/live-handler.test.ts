import { describe, expect, it } from 'vitest'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { liveHandler } from '@/server/domains/api-runtime/live-handler'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function def(script: string): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'published', name: 't', path: '/x', method: 'GET',
    tags: [], permissions: [], bodyContentType: 'json',
    requestParams: [{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }],
    responseSchema: [], localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script }],
  } as ApiDefinitionDraft
}

const deps = {
  knexRegistry: {} as never,
  getDataSource: () => undefined,
  analyzer: new EnhancedSqlAnalyzer(),
} as never
const services = {
  globalVariableService: { list: () => [] } as never,
  projectVariableService: { list: () => [] } as never,
} as never

function appFor(script: string) {
  const app = new OpenAPIHono()
  const route = createRoute({
    method: 'get', path: '/x',
    request: { query: z.object({ id: z.coerce.number().int() }) },
    responses: { 200: { content: { 'application/json': { schema: z.unknown() } }, description: 'ok' } },
  })
  app.openapi(route, (c) => liveHandler(c, def(script), deps, services) as never)
  return app
}

describe('liveHandler', () => {
  it('returns the assemble output on success (200, raw)', async () => {
    const res = await appFor('return { ok: true }').request('/x?id=7')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 400 from zod-openapi request validation before the handler runs', async () => {
    const res = await appFor('return { ok: true }').request('/x?id=abc')
    expect(res.status).toBe(400)
  })

  it('maps a step failure to 500 with the error code', async () => {
    const res = await appFor('throw new Error("boom")').request('/x?id=7')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.code).toBe('STEP_FAILED')
  })

  it('does not crash and returns 400 when body params exist but bodyContentType is not json', async () => {
    const formDef = {
      ...def('return { ok: true }'),
      bodyContentType: 'x-www-form-urlencoded',
      requestParams: [
        { id: 'r1', name: 'id', location: 'query', type: 'integer', required: true },
        { id: 'r2', name: 'payload', location: 'body', type: 'string', required: true },
      ],
    } as ApiDefinitionDraft
    const app = new OpenAPIHono()
    const route = createRoute({
      method: 'get', path: '/x',
      request: { query: z.object({ id: z.coerce.number().int() }) },
      responses: { 200: { content: { 'application/json': { schema: z.unknown() } }, description: 'ok' } },
    })
    app.openapi(route, (c) => liveHandler(c, formDef, deps, services) as never)
    const res = await app.request('/x?id=7')
    expect(res.status).toBe(400)
  })
})