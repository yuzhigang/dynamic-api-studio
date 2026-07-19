import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Hono } from 'hono'

import { projectDbSchemaRoute } from '@/server/routes/project-db-schema.route'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import { createId } from '@/lib/id'
import { jsonbArray } from '@/server/infra/db/repository-helpers'
import type { DataSourceSchemaColumn } from '@/shared/schemas/data-source.schema'

describe.skipIf(!dbAvailable)('project-db-schema route generate-crud', () => {
  const app = new Hono().route('/projects/:projectId/db-schema', projectDbSchemaRoute).onError((error, context) =>
    context.json({ message: error.message }, 500),
  )

  beforeAll(async () => {
    await seedDemoData(platformDb)
  })

  afterAll(async () => {
    // 硬删测试生成的对象与 API/json_schema，避免跨运行累积。
    const testPrefixes = ['rtest_users_', 'rtest_conflict_']
    for (const prefix of testPrefixes) {
      const rows = await platformDb
        .selectFrom('db_schema')
        .select('id')
        .where('object_name', 'like', `${prefix}%`)
        .execute()
      const ids = rows.map((r) => r.id)
      if (ids.length === 0) continue

      await platformDb.deleteFrom('api').where('path', 'like', `/crud/${prefix}%`).execute()
      await platformDb.deleteFrom('json_schema').where('name', 'like', `${prefix}%Schema`).execute()
      await platformDb.deleteFrom('db_schema').where('id', 'in', ids).execute()
    }
  })

  async function insertTestDbSchema(objectName: string) {
    const dbSchemaId = createId('db_schema')
    await platformDb
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
    return dbSchemaId
  }

  it('generates CRUD APIs and returns ids', async () => {
    const objectName = `rtest_users_${Date.now()}`
    const dbSchemaId = await insertTestDbSchema(objectName)

    const response = await app.request(`/projects/project_crm/db-schema/${dbSchemaId}/generate-crud`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.jsonSchemaId).toBeDefined()
    expect(body.apiIds).toHaveLength(5)
  })

  it('returns 500 with conflict message when generating twice', async () => {
    const objectName = `rtest_conflict_${Date.now()}`
    const dbSchemaId = await insertTestDbSchema(objectName)

    const first = await app.request(`/projects/project_crm/db-schema/${dbSchemaId}/generate-crud`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(first.status).toBe(200)

    const second = await app.request(`/projects/project_crm/db-schema/${dbSchemaId}/generate-crud`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(second.status).toBe(500)
    const body = await second.json()
    expect(body.message).toContain('path+method 冲突')
  })
})
