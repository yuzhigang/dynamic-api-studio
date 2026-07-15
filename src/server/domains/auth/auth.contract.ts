import { z } from 'zod'

export type AuthDeps = {
  verifyToken(token: string): string | undefined
  getPermissions(userId: string): string[]
}

export type AuthErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN'

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const loginResponseSchema = z.object({
  token: z.string(),
})