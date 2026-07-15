import { describe, expect, it } from 'vitest'
import { authorize } from '@/server/domains/auth/auth-guard'
import type { AuthDeps } from '@/server/domains/auth/auth.contract'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function def(requireAuth: boolean, permissions: string[] = []): ApiDefinitionDraft {
  return {
    projectId: 'p', status: 'published', name: 'n', path: '/x', method: 'GET',
    tags: [], permissions, requireAuth, bodyContentType: 'json',
    requestParams: [], responseSchema: [], localVariables: [], workflowSteps: [],
  } as ApiDefinitionDraft
}
function c(authorization?: string) {
  return {
    req: { header: (name: string) => (name === 'authorization' ? authorization : undefined) },
    json: (body: unknown, status: number) => ({ status, body }),
  } as never
}
const authDeps = (userId: string | undefined, perms: string[]): AuthDeps => ({
  verifyToken: () => userId,
  getPermissions: () => perms,
})

describe('authorize', () => {
  it('allows when requireAuth false (no token)', () => {
    expect(authorize(c(undefined), def(false), authDeps('u', []))).toBeUndefined()
  })
  it('401 when requireAuth true and no token', async () => {
    const res = authorize(c(undefined), def(true), authDeps(undefined, [])) as unknown as { status: number }
    expect(res.status).toBe(401)
  })
  it('401 when token invalid', async () => {
    const res = authorize(c('Bearer bad'), def(true), authDeps(undefined, [])) as unknown as { status: number }
    expect(res.status).toBe(401)
  })
  it('allows when authenticated and permissions empty', () => {
    expect(authorize(c('Bearer ok'), def(true, []), authDeps('u', []))).toBeUndefined()
  })
  it('allows when authenticated and any permission matches', () => {
    expect(authorize(c('Bearer ok'), def(true, ['order.read', 'x']), authDeps('u', ['order.read']))).toBeUndefined()
  })
  it('403 when authenticated but no permission matches', async () => {
    const res = authorize(c('Bearer ok'), def(true, ['order.write']), authDeps('u', ['order.read'])) as unknown as { status: number }
    expect(res.status).toBe(403)
  })
})