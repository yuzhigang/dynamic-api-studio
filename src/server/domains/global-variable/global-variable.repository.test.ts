import { beforeAll, describe, expect, it } from 'vitest'

import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable, withRollback } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import type { GlobalVariableDraft } from '@/shared/contracts/global-variable.contract'

const singleDraft: GlobalVariableDraft = {
  name: 'tenant_id',
  label: '租户 ID',
  kind: 'single',
  value: 'acme',
  items: [],
}

const listDraft: GlobalVariableDraft = {
  name: 'allowed_status',
  label: '允许状态',
  kind: 'list',
  value: '',
  items: ['active', 'frozen'],
}

describe('GlobalVariableRepository', () => {
  beforeAll(async () => {
    if (dbAvailable) await seedDemoData(platformDb)
  })

  it.skipIf(!dbAvailable)('seeds with at least one single and one list variable', async () => {
    const repository = new GlobalVariableRepository(platformDb)
    const all = await repository.list()

    expect(all.some((variable) => variable.kind === 'single')).toBe(true)
    expect(all.some((variable) => variable.kind === 'list')).toBe(true)
  })

  it.skipIf(!dbAvailable)('creates a new variable with generated id and equal timestamps', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new GlobalVariableRepository(trx)
      const before = (await repository.list()).length

      const created = await repository.save(singleDraft)

      expect(created.id).toBeTruthy()
      expect(created.name).toBe('tenant_id')
      expect(created.createdAt).toBe(created.updatedAt)
      expect(await repository.list()).toHaveLength(before + 1)
    })
  })

  it.skipIf(!dbAvailable)('updates an existing variable while preserving createdAt', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new GlobalVariableRepository(trx)
      const created = await repository.save(listDraft)

      const updated = await repository.save({ ...listDraft, id: created.id, label: '改名后' })

      expect(updated.id).toBe(created.id)
      expect(updated.label).toBe('改名后')
      expect(updated.createdAt).toBe(created.createdAt)
    })
  })

  it.skipIf(!dbAvailable)('rejects a duplicate name on create', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new GlobalVariableRepository(trx)
      await repository.save(singleDraft)

      await expect(repository.save({ ...singleDraft })).rejects.toThrow(/已存在/)
    })
  })

  it.skipIf(!dbAvailable)('allows saving the same variable without triggering its own duplicate check', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new GlobalVariableRepository(trx)
      const created = await repository.save(singleDraft)

      await expect(repository.save({ ...singleDraft, id: created.id })).resolves.toBeTruthy()
    })
  })

  it.skipIf(!dbAvailable)('removes a variable', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new GlobalVariableRepository(trx)
      const created = await repository.save(singleDraft)

      expect(await repository.remove(created.id)).toBe(true)
      expect(await repository.get(created.id)).toBeUndefined()
      expect(await repository.remove(created.id)).toBe(false)
    })
  })
})