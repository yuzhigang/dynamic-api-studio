import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { taskRoute } from '@/server/routes/task.route'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'

// dataSourceId 用已 seed 的真实 db_source（ds_pg 仅存在于 task 的 mock 路由，不在 db_source 表，会触发 FK 违规）。
const validDraft = {
  name: '测试任务',
  enabled: true,
  dataSourceId: 'ds_order_oracle',
  sql: 'SELECT 1',
  trigger: { mode: 'cron', expression: '0 * * * *' },
}

const SEED_TASK_IDS = ['task_cleanup', 'task_sync', 'task_report', 'task_health']

describe('task.route', () => {
  beforeAll(async () => {
    if (dbAvailable) await seedDemoData(platformDb)
  })

  afterAll(async () => {
    if (!dbAvailable) return
    // 路由经单例 repo 提交（无法事务回滚）：硬删非 seed 任务（级联删其日志）+ 手动触发的 run 日志，避免跨运行累积。
    await platformDb.deleteFrom('schedule_task').where('id', 'not in', SEED_TASK_IDS).execute()
    await platformDb.deleteFrom('schedule_task_log').where('trigger', '=', 'manual').execute()
  })

  // 以下两项不访问平台库：/datasources 是 mock；invalid draft 由 zod 在 handler 前拒绝（400）。
  it('returns the mock data sources (not swallowed by /:taskId)', async () => {
    const response = await taskRoute.request('/datasources')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.map((source: { id: string }) => source.id)).toContain('ds_pg')
  })

  it('rejects an invalid draft (interval every < 1)', async () => {
    const response = await taskRoute.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...validDraft, trigger: { mode: 'interval', every: 0, unit: 'minute' } }),
    })
    expect(response.status).toBe(400)
  })

  it.skipIf(!dbAvailable)('lists seeded tasks', async () => {
    const response = await taskRoute.request('/')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  it.skipIf(!dbAvailable)('returns a task by id', async () => {
    const response = await taskRoute.request('/task_cleanup')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.name).toBe('每日临时表清理')
  })

  it.skipIf(!dbAvailable)('404s for unknown task', async () => {
    const response = await taskRoute.request('/nope')
    expect(response.status).toBe(404)
  })

  it.skipIf(!dbAvailable)('creates a task', async () => {
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

  it.skipIf(!dbAvailable)('paginates run logs', async () => {
    const response = await taskRoute.request('/task_cleanup/logs?page=1&pageSize=5')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.items).toHaveLength(5)
    expect(body.total).toBeGreaterThan(5)
    expect(body.page).toBe(1)
  })

  it.skipIf(!dbAvailable)('runs a task and appends a manual log', async () => {
    const before = await (await taskRoute.request('/task_health/logs?page=1&pageSize=100')).json()
    const runResponse = await taskRoute.request('/task_health/run', { method: 'POST' })
    expect(runResponse.status).toBe(200)
    const log = await runResponse.json()
    expect(log.trigger).toBe('manual')
    const after = await (await taskRoute.request('/task_health/logs?page=1&pageSize=100')).json()
    expect(after.total).toBe(before.total + 1)
  })

  it.skipIf(!dbAvailable)('deletes a task', async () => {
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