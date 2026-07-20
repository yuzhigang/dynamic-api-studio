import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Hono } from 'hono'

import { projectDbMigrationRoute } from '@/server/routes/project-db-migration.route'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import { createId } from '@/lib/id'

describe.skipIf(!dbAvailable)('project-db-migration route', () => {
  const app = new Hono()
    .route('/projects/:projectId/db-migrations', projectDbMigrationRoute)
    .onError((error, context) => context.json({ message: error.message }, 500))

  const testProjectId = createId('project')
  const testProjectCode = `RTMIG_${Date.now()}`

  beforeAll(async () => {
    await seedDemoData(platformDb)
    await platformDb
      .insertInto('project')
      .values({
        id: testProjectId,
        code: testProjectCode,
        name: '迁移测试项目',
        description: null,
        icon: null,
        color: null,
        status: 'active',
        api_count: 0,
        db_source_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute()
  })

  afterAll(async () => {
    await platformDb.deleteFrom('db_migration').where('project_id', '=', testProjectId).execute()
    await platformDb.deleteFrom('project').where('id', '=', testProjectId).execute()
  })

  it('lists migrations for a project', async () => {
    const response = await app.request(`/projects/${testProjectId}/db-migrations`)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([])
  })

  it('returns 500 when project has no datasource', async () => {
    const response = await app.request(`/projects/${testProjectId}/db-migrations/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.message).toContain('项目未关联数据源')
  })

  it('returns 500 when project does not exist', async () => {
    const response = await app.request(`/projects/nonexistent/db-migrations/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.message).toContain('项目不存在')
  })
})
