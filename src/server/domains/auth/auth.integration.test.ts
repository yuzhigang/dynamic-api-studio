import { describe, expect, it } from 'vitest'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { liveHandler } from '@/server/domains/api-runtime/live-handler'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'
import type { AuthDeps } from '@/server/domains/auth/auth.contract'

function protectedDef(permissions: string[]): ApiDefinitionDraft {
  return {
    projectId: 'p', status: 'published', name: 'n', path: '/x', method: 'GET',
    tags: [], permissions, requireAuth: true, bodyContentType: 'json',
    requestParams: [], responseSchema: [], localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return { ok: true }' }],
  } as ApiDefinitionDraft
}
const deps = { knexRegistry: {} as never, getDataSource: () => undefined, analyzer: new EnhancedSqlAnalyzer() } as never
const services = { globalVariableService: { list: () => [] } as never, projectVariableService: { list: () => [] } as never } as never

function appFor(authDeps: AuthDeps, permissions: string[]) {
  const app = new OpenAPIHono()
  const route = createRoute({ method: 'get', path: '/x', responses: { 200: { content: { 'application/json': { schema: z.unknown() } }, description: 'ok' } } })
  app.openapi(route, (c) => liveHandler(c, protectedDef(permissions), deps, services, authDeps) as never)
  return app
}

describe('liveHandler auth integration', () => {
  it('401 when requireAuth and no token', async () => {
    const authDeps: AuthDeps = { verifyToken: () => undefined, getPermissions: () => [] }
    expect((await appFor(authDeps, ['order.read']).request('/x')).status).toBe(401)
  })
  it('403 when token valid but no matching permission', async () => {
    const authDeps: AuthDeps = { verifyToken: () => 'u_viewer', getPermissions: () => ['order.read'] }
    expect((await appFor(authDeps, ['order.write']).request('/x', { headers: { authorization: 'Bearer t' } })).status).toBe(403)
  })
  it('200 when token valid and permission matches', async () => {
    const authDeps: AuthDeps = { verifyToken: () => 'u_admin', getPermissions: () => ['order.read'] }
    const res = await appFor(authDeps, ['order.read']).request('/x', { headers: { authorization: 'Bearer t' } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})