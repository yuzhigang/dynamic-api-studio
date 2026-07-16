import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { platformDb } from '@/server/infra/db/db'
import { mockDataSources } from '@/server/domains/scheduled-task/mock-data-sources'
import { ScheduledTaskRepository } from '@/server/domains/scheduled-task/scheduled-task.repository'
import { ScheduledTaskService } from '@/server/domains/scheduled-task/scheduled-task.service'
import { scheduledTaskDraftSchema } from '@/shared/contracts/scheduled-task.contract'

export const scheduledTaskRepository = new ScheduledTaskRepository(platformDb)

const service = new ScheduledTaskService(scheduledTaskRepository)

const logQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

export const taskRoute = new Hono()
  .get('/', async (context) => context.json(await service.list()))
  // 注意：/datasources 必须在 /:taskId 之前注册，否则会被参数路由吞掉
  .get('/datasources', (context) => context.json(mockDataSources))
  .post('/', zValidator('json', scheduledTaskDraftSchema), async (context) =>
    context.json(await service.save(context.req.valid('json'))),
  )
  .get('/:taskId', async (context) => {
    const task = await service.get(context.req.param('taskId'))
    return task ? context.json(task) : context.json({ message: 'Task not found' }, 404)
  })
  .put('/:taskId', zValidator('json', scheduledTaskDraftSchema), async (context) =>
    context.json(
      await service.save({ ...context.req.valid('json'), id: context.req.param('taskId') }),
    ),
  )
  .delete('/:taskId', async (context) => {
    const removed = await service.remove(context.req.param('taskId'))
    return removed ? context.json({ ok: true }) : context.json({ message: 'Task not found' }, 404)
  })
  .get('/:taskId/logs', zValidator('query', logQuerySchema), async (context) => {
    const { page, pageSize } = context.req.valid('query')
    return context.json(await service.listLogs(context.req.param('taskId'), page, pageSize))
  })
  .post('/:taskId/run', async (context) => {
    const log = await service.run(context.req.param('taskId'))
    return log ? context.json(log) : context.json({ message: 'Task not found' }, 404)
  })