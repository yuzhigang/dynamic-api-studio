import type { Context } from 'hono'

import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'
import type { AuthDeps } from '@/server/domains/auth/auth.contract'

/** Check auth for a published API. Returns a 401/403 Response, or undefined to allow. */
export function authorize(c: Context, def: ApiDefinitionDraft, authDeps: AuthDeps): Response | undefined {
  if (!def.requireAuth) return undefined
  const header = c.req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined
  const userId = token ? authDeps.verifyToken(token) : undefined
  if (!userId) return c.json({ code: 'UNAUTHORIZED', message: '需要登录' }, 401)
  if (def.permissions.length === 0) return undefined
  const userPerms = authDeps.getPermissions(userId)
  if (def.permissions.some((p) => userPerms.includes(p))) return undefined
  return c.json({ code: 'FORBIDDEN', message: '权限不足' }, 403)
}