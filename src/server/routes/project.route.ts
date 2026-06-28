import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ProjectRepository } from '@/server/domains/project/project.repository'
import { ProjectService } from '@/server/domains/project/project.service'
import { projectDraftSchema } from '@/shared/contracts/project.contract'

export const projectRepository = new ProjectRepository()

const service = new ProjectService(projectRepository)

export const projectRoute = new Hono()
  .get('/', (context) => context.json(service.list()))
  .post('/', zValidator('json', projectDraftSchema), (context) =>
    context.json(service.save(context.req.valid('json'))),
  )
  .get('/:projectId', (context) => {
    const project = service.get(context.req.param('projectId'))

    return project ? context.json(project) : context.json({ message: 'Project not found' }, 404)
  })
  .put('/:projectId', zValidator('json', projectDraftSchema), (context) =>
    context.json(service.save({ ...context.req.valid('json'), id: context.req.param('projectId') })),
  )
  .post('/:projectId/archive', (context) => {
    const project = service.archive(context.req.param('projectId'))

    return project ? context.json(project) : context.json({ message: 'Project not found' }, 404)
  })
  .post('/:projectId/copy', (context) => {
    const project = service.copy(context.req.param('projectId'))

    return project ? context.json(project) : context.json({ message: 'Project not found' }, 404)
  })
