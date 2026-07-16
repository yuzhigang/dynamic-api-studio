import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { platformDb } from '@/server/infra/db/db'
import { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'
import { projectVariableDraftSchema } from '@/shared/contracts/project-variable.contract'

export const projectVariableRepository = new ProjectVariableRepository(platformDb)

const service = new ProjectVariableService(projectVariableRepository)

export const projectVariableRoute = new Hono()
  .get('/:projectId/variables', async (context) =>
    context.json(await service.list(context.req.param('projectId'))),
  )
  .post('/:projectId/variables', zValidator('json', projectVariableDraftSchema), async (context) =>
    context.json(await service.save(context.req.param('projectId'), context.req.valid('json'))),
  )
  .get('/:projectId/variables/:variableId', async (context) => {
    const variable = await service.get(context.req.param('variableId'))

    return variable
      ? context.json(variable)
      : context.json({ message: 'ProjectVariable not found' }, 404)
  })
  .put(
    '/:projectId/variables/:variableId',
    zValidator('json', projectVariableDraftSchema),
    async (context) =>
      context.json(
        await service.save(context.req.param('projectId'), {
          ...context.req.valid('json'),
          id: context.req.param('variableId'),
        }),
      ),
  )
  .delete('/:projectId/variables/:variableId', async (context) => {
    const removed = await service.remove(context.req.param('variableId'))

    return removed
      ? context.json({ success: true })
      : context.json({ message: 'ProjectVariable not found' }, 404)
  })