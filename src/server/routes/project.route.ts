import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { platformDb } from '@/server/infra/db/db'
import { ProjectRepository } from '@/server/domains/project/project.repository'
import { ProjectService } from '@/server/domains/project/project.service'
import { projectDraftSchema } from '@/shared/contracts/project.contract'

export const projectRepository = new ProjectRepository(platformDb)

const service = new ProjectService(projectRepository)

export const projectRoute = new Hono()
  .get('/', async (context) => context.json(await service.list()))
  .post('/', zValidator('json', projectDraftSchema), async (context) =>
    context.json(await service.save(context.req.valid('json'))),
  )
  .get('/:projectId', async (context) => {
    const project = await service.get(context.req.param('projectId'))

    return project ? context.json(project) : context.json({ message: 'Project not found' }, 404)
  })
  .put('/:projectId', zValidator('json', projectDraftSchema), async (context) =>
    context.json(
      await service.save({ ...context.req.valid('json'), id: context.req.param('projectId') }),
    ),
  )
  .post('/:projectId/archive', async (context) => {
    const project = await service.archive(context.req.param('projectId'))

    return project ? context.json(project) : context.json({ message: 'Project not found' }, 404)
  })
  .post('/:projectId/copy', async (context) => {
    const project = await service.copy(context.req.param('projectId'))

    return project ? context.json(project) : context.json({ message: 'Project not found' }, 404)
  })