import { Hono } from 'hono'
import { z } from 'zod'

import { zValidator } from '@hono/zod-validator'

import { invocationLogRepository } from '@/server/domains/api-runtime/runtime-wiring'
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

export const homeOverviewRoute = new Hono().get('/overview', async (context) => {
  const projects = (await projectRepository.list()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )
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

homeOverviewRoute.get('/invocations', zValidator('query', invocationQuerySchema), async (context) => {
  const { page, pageSize, apiName, method, status, statusCode, startDate, endDate } =
    context.req.valid('query')

  return context.json(
    await invocationLogRepository.query({ apiName, method, status, statusCode, startDate, endDate }, page, pageSize),
  )
})
