import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { platformDb } from '@/server/infra/db/db'
import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import { globalVariableDraftSchema } from '@/shared/contracts/global-variable.contract'

export const globalVariableRepository = new GlobalVariableRepository(platformDb)

const service = new GlobalVariableService(globalVariableRepository)

export const globalVariableRoute = new Hono()
  .get('/', async (context) => context.json(await service.list()))
  .post('/', zValidator('json', globalVariableDraftSchema), async (context) =>
    context.json(await service.save(context.req.valid('json'))),
  )
  .get('/:variableId', async (context) => {
    const variable = await service.get(context.req.param('variableId'))

    return variable
      ? context.json(variable)
      : context.json({ message: 'GlobalVariable not found' }, 404)
  })
  .put('/:variableId', zValidator('json', globalVariableDraftSchema), async (context) =>
    context.json(
      await service.save({ ...context.req.valid('json'), id: context.req.param('variableId') }),
    ),
  )
  .delete('/:variableId', async (context) => {
    const removed = await service.remove(context.req.param('variableId'))

    return removed
      ? context.json({ success: true })
      : context.json({ message: 'GlobalVariable not found' }, 404)
  })