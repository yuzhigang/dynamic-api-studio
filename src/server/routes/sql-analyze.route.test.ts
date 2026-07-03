import { describe, expect, it } from 'vitest'

import { sqlAnalyzeRoute } from '@/server/routes/sql-analyze.route'

const postAnalyze = (body: unknown) =>
  sqlAnalyzeRoute.request('/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /analyze', () => {
  it('accepts localNames and returns no diagnostics for declared local variables', async () => {
    const response = await postAnalyze({
      sql: 'SELECT * FROM detail WHERE order_id IN ($orders[].id)',
      dialect: 'postgresql',
      localNames: ['orders'],
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.staticDiagnostics).toEqual([])
  })

  it('returns diagnostics for unknown local variables', async () => {
    const response = await postAnalyze({
      sql: 'SELECT * FROM detail WHERE order_id IN ($orders[].id)',
      dialect: 'postgresql',
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.staticDiagnostics).toHaveLength(1)
    expect(body.staticDiagnostics[0].message).toBe('局部变量 orders 未定义')
    expect(body.staticDiagnostics[0].severity).toBe('error')
  })

  it('preserves input and global variable validation', async () => {
    const response = await postAnalyze({
      sql: 'SELECT * FROM users WHERE id = $input.id AND tenant_id = $.tenantId',
      dialect: 'postgresql',
      inputNames: ['id'],
      globalNames: ['tenantId'],
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.staticDiagnostics).toEqual([])
  })

  it('rejects a request without sql', async () => {
    const response = await postAnalyze({})
    expect(response.status).toBe(400)
  })
})
