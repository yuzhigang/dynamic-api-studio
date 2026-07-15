import { describe, expect, it } from 'vitest'
import app from '@/server/app'

describe('app published dispatch (end-to-end)', () => {
  it('does not shadow management routes', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
  })

  it('delegates an unknown /api/v1 path to the inner app (404)', async () => {
    const res = await app.request('/api/v1/does-not-exist')
    expect(res.status).toBe(404)
  })

  it('serves the OpenAPI doc with a seed published path', async () => {
    const res = await app.request('/api/openapi')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { paths: Record<string, unknown> }
    expect(json.paths).toHaveProperty('/api/v1/order/query')
  })
})