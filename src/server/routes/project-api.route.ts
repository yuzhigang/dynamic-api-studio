import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { ApiDefinitionService } from '@/server/domains/api-definition/api-definition.service'
import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { projectRepository } from '@/server/routes/project.route'
import {
  apiDefinitionDraftSchema,
  apiTestRequestSchema,
} from '@/shared/contracts/api-definition.contract'

const apiDefinitionService = new ApiDefinitionService(new ApiDefinitionRepository())
const dataSourceRepository = new DataSourceRepository()
const apiTestService = new ApiTestService((id) => dataSourceRepository.get(id))

export const projectApiRoute = new Hono()
  .get('/:projectId/apis', (context) => {
    const projectId = context.req.param('projectId')

    if (!projectRepository.get(projectId)) {
      return context.json({ message: 'Project not found' }, 404)
    }

    return context.json(apiDefinitionService.list(projectId))
  })
  .post('/:projectId/apis', zValidator('json', apiDefinitionDraftSchema), (context) => {
    const projectId = context.req.param('projectId')

    if (!projectRepository.canCreateApi(projectId)) {
      return context.json({ message: 'Project is archived or not found' }, 409)
    }

    return context.json(
      apiDefinitionService.save(projectId, {
        ...context.req.valid('json'),
        projectId,
      }),
    )
  })
  .get('/:projectId/apis/:apiId', (context) => {
    const apiDefinition = apiDefinitionService.get(
      context.req.param('projectId'),
      context.req.param('apiId'),
    )

    return apiDefinition
      ? context.json(apiDefinition)
      : context.json({ message: 'API not found' }, 404)
  })
  .put('/:projectId/apis/:apiId', zValidator('json', apiDefinitionDraftSchema), (context) => {
    const projectId = context.req.param('projectId')
    const apiId = context.req.param('apiId')

    return context.json(
      apiDefinitionService.save(projectId, {
        ...context.req.valid('json'),
        id: apiId,
        projectId,
      }),
    )
  })
  .post('/:projectId/apis/test-draft', zValidator('json', apiTestRequestSchema), async (context) =>
    context.json(await apiTestService.run(context.req.valid('json'))),
  )
  .post('/:projectId/apis/:apiId/test', zValidator('json', apiTestRequestSchema), async (context) =>
    context.json(await apiTestService.run(context.req.valid('json'))),
  )
