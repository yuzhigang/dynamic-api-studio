import { beforeAll, describe, expect, it } from 'vitest'

import { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable, withRollback } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import type { ProjectVariableDraft } from '@/shared/contracts/project-variable.contract'

// 用 seed 中已存在的项目（project_order / project_crm）满足 variable.project_id 外键；
// 变量名避开 seed 已有的 region/channels。
const draft: ProjectVariableDraft = {
  name: 'timezone',
  label: '时区',
  kind: 'single',
  value: 'UTC',
  items: [],
}

describe('ProjectVariableRepository', () => {
  beforeAll(async () => {
    if (dbAvailable) await seedDemoData(platformDb)
  })

  it.skipIf(!dbAvailable)('lists only variables for the given project', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new ProjectVariableRepository(trx)
      const created = await repository.save('project_order', draft)

      expect(await repository.list('project_order')).toContainEqual(created)
      expect(await repository.list('project_crm')).not.toContainEqual(created)
    })
  })

  it.skipIf(!dbAvailable)('creates a variable with generated id, projectId and equal timestamps', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new ProjectVariableRepository(trx)

      const created = await repository.save('project_order', draft)

      expect(created.id).toBeTruthy()
      expect(created.projectId).toBe('project_order')
      expect(created.createdAt).toBe(created.updatedAt)
    })
  })

  it.skipIf(!dbAvailable)('updates an existing variable while preserving createdAt', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new ProjectVariableRepository(trx)
      const created = await repository.save('project_order', draft)

      const updated = await repository.save('project_order', { ...draft, id: created.id, label: '改名后' })

      expect(updated.id).toBe(created.id)
      expect(updated.label).toBe('改名后')
      expect(updated.createdAt).toBe(created.createdAt)
    })
  })

  it.skipIf(!dbAvailable)('rejects a duplicate name within the same project', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new ProjectVariableRepository(trx)
      await repository.save('project_order', draft)

      await expect(repository.save('project_order', { ...draft })).rejects.toThrow(/已存在/)
    })
  })

  it.skipIf(!dbAvailable)('allows the same name in a different project', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new ProjectVariableRepository(trx)
      await repository.save('project_order', draft)

      await expect(repository.save('project_crm', { ...draft })).resolves.toBeTruthy()
    })
  })

  it.skipIf(!dbAvailable)('clears items for single kind and value for list kind', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new ProjectVariableRepository(trx)

      const single = await repository.save('project_order', { name: 'a', label: 'A', kind: 'single', value: '1', items: ['x'] })
      const list = await repository.save('project_order', { name: 'b', label: 'B', kind: 'list', value: 'stale', items: ['x', 'y'] })

      expect(single.items).toEqual([])
      expect(list.value).toBe('')
      expect(list.items).toEqual(['x', 'y'])
    })
  })

  it.skipIf(!dbAvailable)('removes a variable', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new ProjectVariableRepository(trx)
      const created = await repository.save('project_order', draft)

      expect(await repository.remove(created.id)).toBe(true)
      expect(await repository.get(created.id)).toBeUndefined()
      expect(await repository.remove(created.id)).toBe(false)
    })
  })
})