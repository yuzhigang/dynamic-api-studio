import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Hono } from 'hono'

import { projectCustomFunctionRoute } from '@/server/routes/project-custom-function.route'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'

const app = new Hono().route('/projects', projectCustomFunctionRoute).onError((error, context) =>
  context.json({ message: error.message }, 500),
)

describe.skipIf(!dbAvailable)('project-custom-function route', () => {
  beforeAll(async () => {
    await seedDemoData(platformDb)
  })

  afterAll(async () => {
    await platformDb
      .deleteFrom('custom_function')
      .where('name', 'like', 'rtest_%')
      .execute()
  })

  it('lists, creates, updates and deletes project custom functions', async () => {
    const name = `rtest_fn_${Date.now()}`

    const createRes = await app.request(`/projects/project_order/custom-functions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        label: '测试函数',
        body: 'return 1;',
        description: '测试',
      }),
    })
    expect(createRes.status).toBe(200)
    const created = await createRes.json()
    expect(created.id).toBeDefined()
    expect(created.scope).toBe('project')
    expect(created.projectId).toBe('project_order')

    const listRes = await app.request(`/projects/project_order/custom-functions`)
    expect(listRes.status).toBe(200)
    const list = await listRes.json()
    expect(list.some((fn: { id: string }) => fn.id === created.id)).toBe(true)

    const updateRes = await app.request(`/projects/project_order/custom-functions/${created.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        label: '已更新',
        body: 'return 2;',
      }),
    })
    expect(updateRes.status).toBe(200)
    const updated = await updateRes.json()
    expect(updated.label).toBe('已更新')

    const deleteRes = await app.request(`/projects/project_order/custom-functions/${created.id}`, {
      method: 'DELETE',
    })
    expect(deleteRes.status).toBe(200)
    const deleted = await deleteRes.json()
    expect(deleted.success).toBe(true)
  })
})
