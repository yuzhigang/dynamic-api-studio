export type AuthDeps = {
  verifyToken(token: string): string | undefined
  getPermissions(userId: string): string[]
}

export type AuthErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN'