import { beforeAll, describe, expect, it } from 'vitest'

import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { CrudGeneratorService } from '@/server/domains/crud-generator/crud-generator.service'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { JsonSchemaRepository } from '@/server/domains/json-schema/json-schema.repository'
import { ProjectDbSchemaRepository } from '@/server/domains/project-db-schema/project-db-schema.repository'
import { ProjectRepository } from '@/server/domains/project/project.repository'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable, withRollback } from '@/server/infra/db/db-test-helpers'
import { jsonbArray } from '@/server/infra/db/repository-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import { createId } from '@/lib/id'
import type { DataSourceSchemaColumn } from '@/shared/schemas/data-source.schema'

describe('CrudGeneratorService', () => {
  beforeAll(async () => {
    if (dbAvailable) await seedDemoData(platformDb)
  })

  it.skipIf(!dbAvailable)('generates a json_schema and 5 draft APIs from a db_schema row', async () => {
    await withRollback(platformDb, async (trx) => {
      const objectName = `generated_users_${createId('test').slice(-8)}`
      const dbSchemaId = createId('db_schema')

      await trx
        .insertInto('db_schema')
        .values({
          id: dbSchemaId,
          project_id: 'project_crm',
          db_source_id: 'ds_crm_postgres',
          schema_name: null,
          object_type: 'table',
          object_name: objectName,
          columns: jsonbArray([
            { name: 'id', dataType: 'int', nullable: false, isPrimaryKey: true, autoIncrement: true },
            { name: 'name', dataType: 'varchar', nullable: false },
            { name: 'age', dataType: 'int', nullable: true },
          ] as DataSourceSchemaColumn[]) as never,
          foreign_keys: null,
          indexes: null,
          comment: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute()

      const service = new CrudGeneratorService(
        new ProjectDbSchemaRepository(trx),
        new ProjectRepository(trx),
        new DataSourceRepository(trx),
        new JsonSchemaRepository(trx),
        new ApiDefinitionRepository(trx),
      )

      const result = await service.generate('project_crm', dbSchemaId)

      expect(result.jsonSchemaId).toBeDefined()
      expect(result.apiIds).toHaveLength(5)

      const jsonSchema = await new JsonSchemaRepository(trx).get(result.jsonSchemaId)
      expect(jsonSchema).toMatchObject({
        name: `${objectName}Schema`,
        kind: 'response',
        content: {
          type: 'object',
          title: objectName,
        },
      })

      const apiRepository = new ApiDefinitionRepository(trx)
      const apis = await Promise.all(result.apiIds.map((id) => apiRepository.get('project_crm', id)))
      expect(apis.every((api) => api?.status === 'draft')).toBe(true)

      const paths = apis.map((api) => `${api?.method} ${api?.path}`).sort()
      expect(paths).toEqual([
        `DELETE /crud/${objectName}`,
        `GET /crud/${objectName}/detail`,
        `GET /crud/${objectName}/list`,
        `POST /crud/${objectName}`,
        `PUT /crud/${objectName}`,
      ])

      const listApi = apis.find((api) => api?.path === `/crud/${objectName}/list`)
      expect(listApi?.responseSchema).toHaveLength(2)
      expect(listApi?.requestParams.some((p) => p.name === 'pageNo')).toBe(true)
      expect(listApi?.workflowSteps.some((s) => s.role === 'assemble')).toBe(true)
    })
  })

  it.skipIf(!dbAvailable)('rejects generation when path+method already exists', async () => {
    await withRollback(platformDb, async (trx) => {
      const objectName = `generated_conflict_${createId('test').slice(-8)}`
      const dbSchemaId = createId('db_schema')

      await trx
        .insertInto('db_schema')
        .values({
          id: dbSchemaId,
          project_id: 'project_crm',
          db_source_id: 'ds_crm_postgres',
          schema_name: null,
          object_type: 'table',
          object_name: objectName,
          columns: jsonbArray([
            { name: 'id', dataType: 'int', nullable: false, isPrimaryKey: true, autoIncrement: true },
            { name: 'name', dataType: 'varchar', nullable: false },
          ] as DataSourceSchemaColumn[]) as never,
          foreign_keys: null,
          indexes: null,
          comment: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute()

      const service = new CrudGeneratorService(
        new ProjectDbSchemaRepository(trx),
        new ProjectRepository(trx),
        new DataSourceRepository(trx),
        new JsonSchemaRepository(trx),
        new ApiDefinitionRepository(trx),
      )

      await service.generate('project_crm', dbSchemaId)
      await expect(service.generate('project_crm', dbSchemaId)).rejects.toThrow('path+method 冲突')
    })
  })
})
