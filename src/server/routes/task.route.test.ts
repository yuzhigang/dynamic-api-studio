import { describe, expect, it } from 'vitest'

import { taskRoute } from '@/server/routes/task.route'

const validDraft = {
  name: '测试任务',
  enabled: true,
  dataSourceId: 'ds_pg',
  sql: 'SELECT 1',
  trigger: { mode: 'cron', expression: '0 * * * *' },
}

describe('task.route', () => {
  it('lists seeded tasks', async () => {
    const response = await taskRoute.request('/')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  it('returns the mock data sources (not swallowed by /:taskId)', async () => {
    const response = await taskRoute.request('/datasources')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.map((source: { id: string }) => source.id)).toContain('ds_pg')
  })

  it('returns a task by id', async () => {
    const response = await taskRoute.request('/task_cleanup')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.name).toBe('每日临时表清理')
  })

  it('404s for unknown task', async () => {
    const response = await taskRoute.request('/nope')
    expect(response.status).toBe(404)
  })

  it('creates a task', async () => {
    const response = await taskRoute.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validDraft),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBeTruthy()
    expect(body.name).toBe('测试任务')
  })

  it('rejects an invalid draft (interval every < 1)', async () => {
    const response = await taskRoute.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...validDraft, trigger: { mode: 'interval', every: 0, unit: 'minute' } }),
    })
    expect(response.status).toBe(400)
  })

  it('paginates run logs', async () => {
    const response = await taskRoute.request('/task_cleanup/logs?page=1&pageSize=5')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.items).toHaveLength(5)
    expect(body.total).toBeGreaterThan(5)
    expect(body.page).toBe(1)
  })

  it('runs a task and appends a manual log', async () => {
    const before = await (await taskRoute.request('/task_health/logs?page=1&pageSize=100')).json()
    const runResponse = await taskRoute.request('/task_health/run', { method: 'POST' })
    expect(runResponse.status).toBe(200)
    const log = await runResponse.json()
    expect(log.trigger).toBe('manual')
    const after = await (await taskRoute.request('/task_health/logs?page=1&pageSize=100')).json()
    expect(after.total).toBe(before.total + 1)
  })

  it('deletes a task', async () => {
    const created = await (
      await taskRoute.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validDraft),
      })
    ).json()
    const response = await taskRoute.request(`/${created.id}`, { method: 'DELETE' })
    expect(response.status).toBe(200)
    const check = await taskRoute.request(`/${created.id}`)
    expect(check.status).toBe(404)
  })
})
