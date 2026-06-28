import knex, { type Knex } from 'knex'

export type DataSourceConfig = {
  id: string
  client: string
  connection: Knex.StaticConnectionConfig
}

export class KnexRegistry {
  private readonly pools = new Map<string, Knex>()

  getOrCreate(config: DataSourceConfig) {
    const existing = this.pools.get(config.id)

    if (existing) {
      return existing
    }

    const pool = knex({
      client: config.client,
      connection: config.connection,
      pool: {
        min: 0,
        max: 8,
      },
    })

    this.pools.set(config.id, pool)
    return pool
  }

  async destroyAll() {
    await Promise.all(Array.from(this.pools.values()).map((pool) => pool.destroy()))
    this.pools.clear()
  }
}
