import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { platformDb } from '@/server/infra/db/db'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { ApiDefinitionService } from '@/server/domains/api-definition/api-definition.service'
import { apiDefinitionDraftSchema } from '@/shared/contracts/api-definition.contract'

const service = new ApiDefinitionService(new ApiDefinitionRepository(platformDb))
const defaultProjectId = 'project_order'

export const apiDefinitionRoute = new Hono()
  .get('/', async (context) => context.json(await service.list(defaultProjectId)))
  .get('/:id', async (context) => {
    const apiDefinition = await service.get(defaultProjectId, context.req.param('id'))

    if (!apiDefinition) {
      return context.json({ message: 'API definition not found' }, 404)
    }

    return context.json(apiDefinition)
  })
  .post('/', zValidator('json', apiDefinitionDraftSchema), async (context) => {
    const draft = context.req.valid('json')
    return context.json(await service.save(draft.projectId, draft))
  })