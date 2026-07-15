import { randomUUID } from 'node:crypto'

export class AuthSessionStore {
  private readonly sessions = new Map<string, string>()

  issue(userId: string): string {
    const token = randomUUID()
    this.sessions.set(token, userId)
    return token
  }

  verify(token: string): string | undefined {
    return this.sessions.get(token)
  }
}