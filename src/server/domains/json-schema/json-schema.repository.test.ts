import { beforeAll, describe, expect, it } from 'vitest'

import { JsonSchemaRepository } from '@/server/domains/json-schema/json-schema.repository'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable, withRollback } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'

describe('JsonSchemaRepository', () => {
  beforeAll(async () => {
    if (dbAvailable) await seedDemoData(platformDb)
  })

  it.skipIf(!dbAvailable)('saves and retrieves a json_schema record', async () => {
    await withRollback(platformDb, async (trx) => {
      const repository = new JsonSchemaRepository(trx)
      const saved = await repository.save({
        projectId: 'project_crm',
        name: 'CustomerSchema',
        kind: 'response',
        content: {
          type: 'object',
          title: 'customers',
          properties: { id: { type: 'integer' } },
        },
        description: '客户实体 schema',
      })

      expect(saved.id).toBeDefined()

      const found = await repository.get(saved.id)
      expect(found).toMatchObject({
        projectId: 'project_crm',
        name: 'CustomerSchema',
        kind: 'response',
        content: {
          type: 'object',
          title: 'customers',
          properties: { id: { type: 'integer' } },
        },
        description: '客户实体 schema',
      })
    })
  })
})
