import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import type { AuthSessionStore } from '@/server/domains/auth/auth-session.store'
import type { UserRepository } from '@/server/domains/auth/user.repository'
import { loginRequestSchema } from '@/server/domains/auth/auth.contract'

export function authRoute(userRepository: UserRepository, authSessionStore: AuthSessionStore): Hono {
  return new Hono().post(
    '/login',
    zValidator('json', loginRequestSchema),
    (c) => {
      const { username, password } = c.req.valid('json')
      const user = userRepository.findByCredentials(username, password)
      if (!user) return c.json({ code: 'UNAUTHORIZED', message: '用户名或密码错误' }, 401)
      const token = authSessionStore.issue(user.id)
      return c.json({ token }, 200)
    },
  )
}