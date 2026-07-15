import { describe, expect, it } from 'vitest'
import { UserRepository } from '@/server/domains/auth/user.repository'

describe('UserRepository', () => {
  const repo = new UserRepository()

  it('findByCredentials succeeds with correct credentials', () => {
    expect(repo.findByCredentials('admin', 'admin')?.id).toBe('u_admin')
  })

  it('findByCredentials fails with wrong password', () => {
    expect(repo.findByCredentials('admin', 'wrong')).toBeUndefined()
  })

  it('findByCredentials fails with unknown user', () => {
    expect(repo.findByCredentials('nobody', 'x')).toBeUndefined()
  })

  it('getPermissions returns the user permissions', () => {
    expect(repo.getPermissions('u_viewer')).toEqual(['order.read'])
  })

  it('getPermissions returns [] for unknown user', () => {
    expect(repo.getPermissions('nope')).toEqual([])
  })
})