import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import { globalVariableDraftSchema } from '@/shared/contracts/global-variable.contract'

export const globalVariableRepository = new GlobalVariableRepository()

const service = new GlobalVariableService(globalVariableRepository)

export const globalVariableRoute = new Hono()
  .get('/', (context) => context.json(service.list()))
  .post('/', zValidator('json', globalVariableDraftSchema), (context) =>
    context.json(service.save(context.req.valid('json'))),
  )
  .get('/:variableId', (context) => {
    const variable = service.get(context.req.param('variableId'))

    return variable
      ? context.json(variable)
      : context.json({ message: 'GlobalVariable not found' }, 404)
  })
  .put('/:variableId', zValidator('json', globalVariableDraftSchema), (context) =>
    context.json(
      service.save({ ...context.req.valid('json'), id: context.req.param('variableId') }),
    ),
  )
  .delete('/:variableId', (context) => {
    const removed = service.remove(context.req.param('variableId'))

    return removed
      ? context.json({ success: true })
      : context.json({ message: 'GlobalVariable not found' }, 404)
  })
