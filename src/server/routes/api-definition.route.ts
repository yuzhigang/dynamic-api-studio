import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { ApiDefinitionService } from '@/server/domains/api-definition/api-definition.service'
import { apiDefinitionDraftSchema } from '@/shared/contracts/api-definition.contract'

const service = new ApiDefinitionService(new ApiDefinitionRepository())
const defaultProjectId = 'project_order'

export const apiDefinitionRoute = new Hono()
  .get('/', (context) => context.json(service.list(defaultProjectId)))
  .get('/:id', (context) => {
    const apiDefinition = service.get(defaultProjectId, context.req.param('id'))

    if (!apiDefinition) {
      return context.json({ message: 'API definition not found' }, 404)
    }

    return context.json(apiDefinition)
  })
  .post('/', zValidator('json', apiDefinitionDraftSchema), (context) => {
    const draft = context.req.valid('json')
    return context.json(service.save(draft.projectId, draft))
  })
