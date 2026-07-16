import { beforeAll, describe, expect, it } from 'vitest'
import app from '@/server/app'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'

describe('app published dispatch (end-to-end)', () => {
  beforeAll(async () => {
    if (dbAvailable) await seedDemoData(platformDb)
  })

  it('does not shadow management routes', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
  })

  // 以下两项走 published 分发（catch-all → initPublishedRuntime 读 DB），依赖平台库。
  it.skipIf(!dbAvailable)('delegates an unknown /api/v1 path to the inner app (404)', async () => {
    const res = await app.request('/api/v1/does-not-exist')
    expect(res.status).toBe(404)
  })

  it.skipIf(!dbAvailable)('serves the OpenAPI doc with a seed published path', async () => {
    const res = await app.request('/api/openapi')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { paths: Record<string, unknown> }
    expect(json.paths).toHaveProperty('/api/v1/order/query')
  })
})