import { describe, expect, it } from 'vitest'
import { authRoute } from '@/server/domains/auth/auth.route'
import { UserRepository } from '@/server/domains/auth/user.repository'
import { AuthSessionStore } from '@/server/domains/auth/auth-session.store'
import type { AuthDeps } from '@/server/domains/auth/auth.contract'

function route() {
  return authRoute(new UserRepository(), new AuthSessionStore())
}

describe('auth.route POST /login', () => {
  it('returns a token for valid credentials', async () => {
    const res = await route().request('/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { token: string }
    expect(body.token).toBeTruthy()
  })

  it('returns 401 for invalid credentials', async () => {
    const res = await route().request('/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    })
    expect(res.status).toBe(401)
  })

  it('issues a token verifiable by authDeps (shared session store)', async () => {
    const users = new UserRepository()
    const sessions = new AuthSessionStore()
    const app = authRoute(users, sessions)
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    })
    const { token } = await res.json() as { token: string }
    const authDeps: AuthDeps = {
      verifyToken: (t) => sessions.verify(t),
      getPermissions: (id) => users.getPermissions(id),
    }
    expect(authDeps.verifyToken(token)).toBe('u_admin')
  })
})