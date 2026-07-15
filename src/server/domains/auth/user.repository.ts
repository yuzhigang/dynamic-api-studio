export type User = { id: string; username: string; password: string; permissions: string[] }

const seedUsers: User[] = [
  { id: 'u_admin', username: 'admin', password: 'admin', permissions: ['order.read', 'order.write', 'customer.read', 'product.read', 'stock.read', 'report.read'] },
  { id: 'u_viewer', username: 'viewer', password: 'viewer', permissions: ['order.read'] },
]

export class UserRepository {
  private readonly users = new Map(seedUsers.map((u) => [u.id, u]))

  findByCredentials(username: string, password: string): User | undefined {
    return seedUsers.find((u) => u.username === username && u.password === password)
  }

  getPermissions(userId: string): string[] {
    return this.users.get(userId)?.permissions ?? []
  }
}