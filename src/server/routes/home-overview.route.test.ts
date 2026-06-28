import { describe, expect, it } from 'vitest'

import { homeOverviewRoute } from '@/server/routes/home-overview.route'

describe('GET /api/home/invocations', () => {
  it('returns paginated mock invocation logs', async () => {
    const response = await homeOverviewRoute.request('/invocations?page=1&pageSize=10')
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.items).toHaveLength(10)
    expect(body.total).toBeGreaterThan(10)
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(10)

    const first = body.items[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('invokedAt')
    expect(first).toHaveProperty('method')
    expect(first).toHaveProperty('path')
    expect(first).toHaveProperty('statusCode')
    expect(first).toHaveProperty('status')
    expect(first).toHaveProperty('durationMs')
  })

  it('returns second page correctly', async () => {
    const response = await homeOverviewRoute.request('/invocations?page=2&pageSize=10')
    const body = await response.json()
    expect(body.page).toBe(2)
    expect(body.items).toHaveLength(10)
  })

  it('defaults to page 1 and pageSize 10', async () => {
    const response = await homeOverviewRoute.request('/invocations')
    const body = await response.json()
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(10)
  })

  it('clamps page=0 to page 1', async () => {
    const response = await homeOverviewRoute.request('/invocations?page=0&pageSize=10')
    expect(response.status).toBe(400)
  })

  it('clamps pageSize=0 to default pageSize 10', async () => {
    const response = await homeOverviewRoute.request('/invocations?page=1&pageSize=0')
    expect(response.status).toBe(400)
  })

  it('handles non-numeric page gracefully', async () => {
    const response = await homeOverviewRoute.request('/invocations?page=abc')
    expect(response.status).toBe(400)
  })

  it('returns empty items for page beyond data range', async () => {
    const response = await homeOverviewRoute.request('/invocations?page=999&pageSize=10')
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.items).toHaveLength(0)
    expect(body.total).toBe(28)
    expect(body.page).toBe(999)
    expect(body.pageSize).toBe(10)
  })

  it('filters by status', async () => {
    const response = await homeOverviewRoute.request('/invocations?pageSize=100&status=timeout')
    const body = await response.json()
    expect(body.total).toBeGreaterThan(0)
    expect(body.items.every((log: { status: string }) => log.status === 'timeout')).toBe(true)
  })

  it('filters by exact status code', async () => {
    const response = await homeOverviewRoute.request('/invocations?pageSize=100&statusCode=504')
    const body = await response.json()
    expect(body.total).toBeGreaterThan(0)
    expect(body.items.every((log: { statusCode: number }) => log.statusCode === 504)).toBe(true)
  })

  it('filters by method', async () => {
    const response = await homeOverviewRoute.request('/invocations?pageSize=100&method=GET')
    const body = await response.json()
    expect(body.total).toBeGreaterThan(0)
    expect(body.items.every((log: { method: string }) => log.method === 'GET')).toBe(true)
  })

  it('filters by apiName/path keyword (case-insensitive)', async () => {
    const response = await homeOverviewRoute.request('/invocations?pageSize=100&apiName=customer')
    const body = await response.json()
    expect(body.total).toBeGreaterThan(0)
    expect(
      body.items.every((log: { path: string }) => log.path.includes('customer')),
    ).toBe(true)
  })

  it('filters by date range (inclusive)', async () => {
    const inRange = await homeOverviewRoute.request(
      '/invocations?pageSize=100&startDate=2024-06-07&endDate=2024-06-07',
    )
    const inRangeBody = await inRange.json()
    expect(inRangeBody.total).toBe(28)

    const outOfRange = await homeOverviewRoute.request(
      '/invocations?pageSize=100&startDate=2024-06-08',
    )
    const outOfRangeBody = await outOfRange.json()
    expect(outOfRangeBody.total).toBe(0)
  })

  it('rejects invalid status enum', async () => {
    const response = await homeOverviewRoute.request('/invocations?status=unknown')
    expect(response.status).toBe(400)
  })
})
