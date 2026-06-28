import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'
import { projectVariableDraftSchema } from '@/shared/contracts/project-variable.contract'

export const projectVariableRepository = new ProjectVariableRepository()

const service = new ProjectVariableService(projectVariableRepository)

export const projectVariableRoute = new Hono()
  .get('/:projectId/variables', (context) =>
    context.json(service.list(context.req.param('projectId'))),
  )
  .post('/:projectId/variables', zValidator('json', projectVariableDraftSchema), (context) =>
    context.json(service.save(context.req.param('projectId'), context.req.valid('json'))),
  )
  .get('/:projectId/variables/:variableId', (context) => {
    const variable = service.get(context.req.param('variableId'))

    return variable
      ? context.json(variable)
      : context.json({ message: 'ProjectVariable not found' }, 404)
  })
  .put(
    '/:projectId/variables/:variableId',
    zValidator('json', projectVariableDraftSchema),
    (context) =>
      context.json(
        service.save(context.req.param('projectId'), {
          ...context.req.valid('json'),
          id: context.req.param('variableId'),
        }),
      ),
  )
  .delete('/:projectId/variables/:variableId', (context) => {
    const removed = service.remove(context.req.param('variableId'))

    return removed
      ? context.json({ success: true })
      : context.json({ message: 'ProjectVariable not found' }, 404)
  })
