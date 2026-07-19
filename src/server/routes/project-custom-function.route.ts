import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { platformDb } from '@/server/infra/db/db'
import { CustomFunctionRepository } from '@/server/domains/custom-function/custom-function.repository'
import { CustomFunctionService } from '@/server/domains/custom-function/custom-function.service'
import { customFunctionDraftSchema } from '@/shared/contracts/custom-function.contract'

const repository = new CustomFunctionRepository(platformDb)
const service = new CustomFunctionService(repository)

export const projectCustomFunctionRoute = new Hono()
  .get('/:projectId/custom-functions', async (context) =>
    context.json(await service.listByProject(context.req.param('projectId')!)),
  )
  .post(
    '/:projectId/custom-functions',
    zValidator('json', customFunctionDraftSchema),
    async (context) => {
      const projectId = context.req.param('projectId')!
      const draft = context.req.valid('json')
      return context.json(await service.save(projectId, { ...draft, scope: 'project' }))
    },
  )
  .get('/:projectId/custom-functions/:functionId', async (context) => {
    const fn = await service.get(context.req.param('functionId')!)
    return fn ? context.json(fn) : context.json({ message: 'CustomFunction not found' }, 404)
  })
  .put(
    '/:projectId/custom-functions/:functionId',
    zValidator('json', customFunctionDraftSchema),
    async (context) => {
      const projectId = context.req.param('projectId')!
      const draft = context.req.valid('json')
      return context.json(
        await service.save(projectId, { ...draft, id: context.req.param('functionId'), scope: 'project' }),
      )
    },
  )
  .delete('/:projectId/custom-functions/:functionId', async (context) => {
    const removed = await service.remove(context.req.param('functionId')!)
    return removed ? context.json({ success: true }) : context.json({ message: 'CustomFunction not found' }, 404)
  })
