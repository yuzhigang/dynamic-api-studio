import { beforeAll, describe, expect, it } from 'vitest'

import { CustomFunctionRepository } from '@/server/domains/custom-function/custom-function.repository'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable, withRollback } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import type { CustomFunctionDraft } from '@/shared/contracts/custom-function.contract'

const draft: CustomFunctionDraft = {
  scope: 'project',
  name: 'calcTotal',
  label: '计算总价',
  language: 'javascript',
  body: 'return args.price * args.quantity;',
  description: '根据单价和数量计算总价',
  inputSchema: [],
  outputSchema: [],
}

describe('CustomFunctionRepository', () => {
  beforeAll(async () => {
    if (dbAvailable) await seedDemoData(platformDb)
  })

  it.skipIf(!dbAvailable)('lists only project-scoped functions for the given project', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new CustomFunctionRepository(trx)
      const created = await repository.save('project_order', draft)

      expect(await repository.listByProject('project_order')).toContainEqual(created)
      expect(await repository.listByProject('project_crm')).not.toContainEqual(created)
    })
  })

  it.skipIf(!dbAvailable)('creates a function with generated id and projectId', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new CustomFunctionRepository(trx)
      const created = await repository.save('project_order', draft)

      expect(created.id).toBeTruthy()
      expect(created.projectId).toBe('project_order')
      expect(created.scope).toBe('project')
    })
  })

  it.skipIf(!dbAvailable)('updates an existing function', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new CustomFunctionRepository(trx)
      const created = await repository.save('project_order', draft)

      const updated = await repository.save('project_order', { ...draft, id: created.id, label: '改名后' })

      expect(updated.id).toBe(created.id)
      expect(updated.label).toBe('改名后')
    })
  })

  it.skipIf(!dbAvailable)('rejects a duplicate name within the same project', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new CustomFunctionRepository(trx)
      await repository.save('project_order', draft)

      await expect(repository.save('project_order', { ...draft })).rejects.toThrow(/已存在/)
    })
  })

  it.skipIf(!dbAvailable)('allows the same name in a different project', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new CustomFunctionRepository(trx)
      await repository.save('project_order', draft)

      await expect(repository.save('project_crm', { ...draft })).resolves.toBeTruthy()
    })
  })

  it.skipIf(!dbAvailable)('removes a function', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new CustomFunctionRepository(trx)
      const created = await repository.save('project_order', draft)

      expect(await repository.remove(created.id)).toBe(true)
      expect(await repository.get(created.id)).toBeUndefined()
      expect(await repository.remove(created.id)).toBe(false)
    })
  })
})
