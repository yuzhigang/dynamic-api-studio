import { describe, expect, it } from 'vitest'

import { sqlTestRoute } from '@/server/routes/sql-test.route'

const postTest = (body: unknown) =>
  sqlTestRoute.request('/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /test', () => {
  it('accepts localValues and renders local variables into SQL/params', async () => {
    const response = await postTest({
      sql: 'SELECT * FROM detail WHERE order_id IN ($orders[].id)',
      dialect: 'postgresql',
      params: {},
      localNames: ['orders'],
      localValues: { orders: [{ id: 1 }, { id: 2 }] },
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.sql).toContain('IN (?, ?)')
    expect(body.params.map((p: { value: unknown }) => p.value)).toEqual([1, 2])
    expect(body.diagnostics).toEqual([])
  })

  it('preserves input and global value rendering', async () => {
    const response = await postTest({
      sql: 'SELECT * FROM users WHERE id = $input.id AND tenant_id = $.tenantId',
      dialect: 'postgresql',
      params: { id: 42 },
      inputNames: ['id'],
      globalNames: ['tenantId'],
      globalValues: { tenantId: 't-123' },
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.params).toHaveLength(2)
    expect(body.params[0]).toEqual({ value: 42, type: 'string' })
    expect(body.params[1]).toEqual({ value: 't-123', type: 'string' })
  })

  it('rejects a request without sql or params', async () => {
    const response = await postTest({})
    expect(response.status).toBe(400)
  })
})
