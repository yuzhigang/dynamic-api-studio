import { beforeAll, describe, expect, it } from 'vitest'

import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable, withRollback } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import type { DataSourceDraft } from '@/shared/contracts/data-source.contract'

const draft: DataSourceDraft = {
  name: '测试库',
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'demo',
  username: 'root',
  password: 'secret',
  description: '',
}

describe('DataSourceRepository', () => {
  beforeAll(async () => {
    if (dbAvailable) await seedDemoData(platformDb)
  })

  it.skipIf(!dbAvailable)('creates a new data source with generated id and timestamps', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new DataSourceRepository(trx)
      const before = (await repository.list()).length

      const created = await repository.save(draft)

      expect(created.id).toBeTruthy()
      expect(created.name).toBe('测试库')
      expect(created.createdAt).toBe(created.updatedAt)
      expect(await repository.list()).toHaveLength(before + 1)
    })
  })

  it.skipIf(!dbAvailable)('updates an existing data source while preserving createdAt', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new DataSourceRepository(trx)
      const created = await repository.save(draft)

      const updated = await repository.save({ ...draft, id: created.id, name: '改名后' })

      expect(updated.id).toBe(created.id)
      expect(updated.name).toBe('改名后')
      expect(updated.createdAt).toBe(created.createdAt)
    })
  })

  it.skipIf(!dbAvailable)('removes a data source', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new DataSourceRepository(trx)
      const created = await repository.save(draft)

      expect(await repository.remove(created.id)).toBe(true)
      expect(await repository.get(created.id)).toBeUndefined()
      expect(await repository.remove(created.id)).toBe(false)
    })
  })

  it('reports success when host and database are present', () => {
    const repository = new DataSourceRepository({} as never)

    expect(repository.testConnection(draft).success).toBe(true)
  })

  it('reports failure when host is missing', () => {
    const repository = new DataSourceRepository({} as never)

    const result = repository.testConnection({ ...draft, host: '  ' })

    expect(result.success).toBe(false)
    expect(result.message).toContain('连接失败')
  })
})