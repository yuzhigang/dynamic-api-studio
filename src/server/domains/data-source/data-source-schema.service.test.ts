import { describe, expect, it, vi } from 'vitest'

import { DataSourceSchemaService } from '@/server/domains/data-source/data-source-schema.service'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable, withRollback } from '@/server/infra/db/db-test-helpers'
import type { DataSourceSchema } from '@/shared/contracts/data-source.contract'

const fakeDs = {
  id: 'ds_crm_postgres',
  name: 'pg',
  dialect: 'postgresql',
  host: 'h',
  port: 5432,
  database: 'd',
  username: 'u',
  password: 'p',
  createdAt: 't',
  updatedAt: 't',
}

const cannedSchema: DataSourceSchema = {
  datasourceId: 'ds_crm_postgres',
  tables: [
    {
      name: 'sample',
      schemaName: 'public',
      objectType: 'table',
      columns: [{ name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true, ordinalPosition: 1 }],
    },
  ],
}

describe.skipIf(!dbAvailable)('DataSourceSchemaService cache', () => {
  it('introspects on cache miss and serves from cache on hit', async () => {
    await withRollback(platformDb, async (trx) => {
      const introspectSpy = vi.fn().mockResolvedValue(cannedSchema)
      const repo = { get: vi.fn().mockResolvedValue(fakeDs) } as never
      const knexRegistry = { getOrCreate: vi.fn().mockReturnValue({}) } as never
      const service = new DataSourceSchemaService(repo, knexRegistry, trx, { introspect: introspectSpy } as never, 60_000)

      const first = await service.getDataSourceSchema('ds_crm_postgres')
      expect(first.tables.map((t) => t.name)).toContain('sample')
      expect(introspectSpy).toHaveBeenCalledTimes(1)

      // 第二次命中缓存，不再探测
      const second = await service.getDataSourceSchema('ds_crm_postgres')
      expect(second.tables.map((t) => t.name)).toContain('sample')
      expect(introspectSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('re-introspects when cache is stale (TTL exceeded)', async () => {
    await withRollback(platformDb, async (trx) => {
      const introspectSpy = vi.fn().mockResolvedValue(cannedSchema)
      const repo = { get: vi.fn().mockResolvedValue(fakeDs) } as never
      const knexRegistry = { getOrCreate: vi.fn().mockReturnValue({}) } as never
      // TTL 为负 → 缓存始终判定过期 → 每次都重新探测
      const service = new DataSourceSchemaService(repo, knexRegistry, trx, { introspect: introspectSpy } as never, -1)

      await service.getDataSourceSchema('ds_crm_postgres')
      await service.getDataSourceSchema('ds_crm_postgres')
      expect(introspectSpy).toHaveBeenCalledTimes(2)
    })
  })

  it('returns empty for unknown datasource without introspecting', async () => {
    await withRollback(platformDb, async (trx) => {
      const introspectSpy = vi.fn()
      const repo = { get: vi.fn().mockResolvedValue(undefined) } as never
      const knexRegistry = { getOrCreate: vi.fn() } as never
      const service = new DataSourceSchemaService(repo, knexRegistry, trx, { introspect: introspectSpy } as never, 60_000)

      const schema = await service.getDataSourceSchema('nope')
      expect(schema.tables).toEqual([])
      expect(introspectSpy).not.toHaveBeenCalled()
    })
  })
})