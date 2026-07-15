import { describe, expect, it } from 'vitest'
import { AuthSessionStore } from '@/server/domains/auth/auth-session.store'

describe('AuthSessionStore', () => {
  it('issue returns a token that verify recognizes', () => {
    const store = new AuthSessionStore()
    const token = store.issue('u_admin')
    expect(token).toBeTruthy()
    expect(store.verify(token)).toBe('u_admin')
  })

  it('verify returns undefined for an unknown token', () => {
    const store = new AuthSessionStore()
    expect(store.verify('not-a-real-token')).toBeUndefined()
  })

  it('issued tokens are distinct', () => {
    const store = new AuthSessionStore()
    expect(store.issue('u_admin')).not.toBe(store.issue('u_admin'))
  })
})