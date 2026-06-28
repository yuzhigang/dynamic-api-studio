import { Hono } from 'hono'
import { z } from 'zod'

import { zValidator } from '@hono/zod-validator'

import { mockInvocationLogs } from '@/modules/invocation-log/mock-invocation-logs'
import { projectRepository } from '@/server/routes/project.route'

const invocationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  apiName: z.string().trim().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  status: z.enum(['success', 'failed', 'timeout']).optional(),
  statusCode: z.coerce.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const homeOverviewRoute = new Hono().get('/overview', (context) => {
  const projects = projectRepository
    .list()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  const apiCount = projects.reduce((total, project) => total + project.apiCount, 0)

  return context.json({
    metrics: {
      projectCount: projects.length,
      apiCount,
      datasourceCount: 3,
      invocationCount: 128_600,
    },
    recentProjects: projects.slice(0, 10),
  })
})

homeOverviewRoute.get('/invocations', zValidator('query', invocationQuerySchema), (context) => {
  const { page, pageSize, apiName, method, status, statusCode, startDate, endDate } =
    context.req.valid('query')

  const keyword = apiName?.toLowerCase()

  const filtered = mockInvocationLogs.filter((log) => {
    if (keyword) {
      const haystack = `${log.apiName ?? ''} ${log.path}`.toLowerCase()
      if (!haystack.includes(keyword)) return false
    }
    if (method && log.method !== method) return false
    if (status && log.status !== status) return false
    if (statusCode != null && log.statusCode !== statusCode) return false

    // invokedAt 形如 "2024-06-07 15:32:18"，取日期部分做闭区间比较
    const logDate = log.invokedAt.slice(0, 10)
    if (startDate && logDate < startDate) return false
    if (endDate && logDate > endDate) return false

    return true
  })

  const total = filtered.length
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  return context.json({ items, total, page, pageSize })
})
