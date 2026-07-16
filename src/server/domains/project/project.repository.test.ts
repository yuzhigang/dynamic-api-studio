import { beforeAll, describe, expect, it } from 'vitest'

import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { ProjectRepository } from '@/server/domains/project/project.repository'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable, withRollback } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import { createEmptyApiDefinition } from '@/shared/api-definition/create-empty-api-definition'

describe('project-scoped api repositories', () => {
  beforeAll(async () => {
    // 仅在有平台库时种子 demo 数据（DB 集成用例依赖 project_order 存在且 active）。
    if (dbAvailable) await seedDemoData(platformDb)
  })

  it.skipIf(!dbAvailable)('lists only APIs that belong to the requested project', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new ApiDefinitionRepository(trx)
      const initialOrderApiCount = (await repository.list('project_order')).length

      await repository.save(
        'project_order',
        createEmptyApiDefinition({ projectId: 'project_order', name: '订单 API', path: '/api/v1/test/order-list-a', method: 'GET' }),
      )
      await repository.save(
        'project_crm',
        createEmptyApiDefinition({ projectId: 'project_crm', name: '客户 API', path: '/api/v1/test/customer-list-a', method: 'GET' }),
      )

      expect(await repository.list('project_order')).toHaveLength(initialOrderApiCount + 1)
      expect((await repository.list('project_order')).map((api) => api.name)).toContain('订单 API')
      expect((await repository.list('project_order')).map((api) => api.name)).not.toContain('客户 API')
    })
  })

  it.skipIf(!dbAvailable)('preserves the requested API lifecycle status when saving', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new ApiDefinitionRepository(trx)
      const saved = await repository.save(
        'project_order',
        createEmptyApiDefinition({
          projectId: 'project_order',
          name: '已发布 API',
          status: 'published',
          path: '/api/v1/test/published-status',
          method: 'GET',
        }),
      )

      expect(saved.status).toBe('published')
      expect((await repository.list('project_order')).find((api) => api.id === saved.id)?.status).toBe('published')
    })
  })

  it.skipIf(!dbAvailable)('prevents API creation for archived projects', async () => {
    await withRollback(platformDb, async (trx) => {
      const projectRepository = new ProjectRepository(trx)

      await projectRepository.archive('project_order')

      expect(await projectRepository.canCreateApi('project_order')).toBe(false)
    })
  })

  it.skipIf(!dbAvailable)('copies a project as a new active project container', async () => {
    await withRollback(platformDb, async (trx) => {
      const projectRepository = new ProjectRepository(trx)
      const copied = await projectRepository.copy('project_order')

      expect(copied).toMatchObject({
        code: 'ORDER_COPY',
        name: '订单中心 副本',
        status: 'active',
        apiCount: 0,
      })
      expect(copied?.id).not.toBe('project_order')
      expect((await projectRepository.list()).map((project) => project.id)).toContain(copied?.id)
    })
  })
})