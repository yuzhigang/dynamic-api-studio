import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ApiDefinitionService } from '@/server/domains/api-definition/api-definition.service'
import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import { projectRepository } from '@/server/routes/project.route'
import { apiDefinitionDraftSchema, apiTestRequestSchema } from '@/shared/contracts/api-definition.contract'
import {
  apiDefinitionRepository,
  dataSourceRepository,
  invocationLogRepository,
  runtimeDeps,
  runtimeServices,
  authDeps,
} from '@/server/domains/api-runtime/runtime-wiring'
import { rebuildPublishedRouter } from '@/server/domains/api-runtime/published-router'

const apiDefinitionService = new ApiDefinitionService(apiDefinitionRepository)
const apiTestService = new ApiTestService((id) => dataSourceRepository.get(id), runtimeServices, invocationLogRepository)

export const projectApiRoute = new Hono()
  .get('/:projectId/apis', async (context) => {
    const projectId = context.req.param('projectId')
    if (!(await projectRepository.get(projectId))) return context.json({ message: 'Project not found' }, 404)
    return context.json(await apiDefinitionService.list(projectId))
  })
  .post('/:projectId/apis', zValidator('json', apiDefinitionDraftSchema), async (context) => {
    const projectId = context.req.param('projectId')
    if (!(await projectRepository.canCreateApi(projectId))) return context.json({ message: 'Project is archived or not found' }, 409)
    const draft = context.req.valid('json')
    if (draft.status === 'published' && !(await apiDefinitionRepository.isPathMethodUnique(draft.path, draft.method, draft.id))) {
      return context.json({ message: 'path+method 已被其他已发布 API 占用' }, 409)
    }
    const saved = await apiDefinitionService.save(projectId, draft)
    await rebuildPublishedRouter(runtimeDeps, runtimeServices, apiDefinitionRepository, authDeps)
    return context.json(saved)
  })
  .get('/:projectId/apis/:apiId', async (context) => {
    const apiDefinition = await apiDefinitionService.get(context.req.param('projectId'), context.req.param('apiId'))
    return apiDefinition ? context.json(apiDefinition) : context.json({ message: 'API not found' }, 404)
  })
  .put('/:projectId/apis/:apiId', zValidator('json', apiDefinitionDraftSchema), async (context) => {
    const projectId = context.req.param('projectId')
    const apiId = context.req.param('apiId')
    const draft = context.req.valid('json')
    if (draft.status === 'published' && !(await apiDefinitionRepository.isPathMethodUnique(draft.path, draft.method, apiId))) {
      return context.json({ message: 'path+method 已被其他已发布 API 占用' }, 409)
    }
    const saved = await apiDefinitionService.save(projectId, { ...draft, id: apiId, projectId })
    await rebuildPublishedRouter(runtimeDeps, runtimeServices, apiDefinitionRepository, authDeps)
    return context.json(saved)
  })
  .post('/:projectId/apis/test-draft', zValidator('json', apiTestRequestSchema), async (context) =>
    context.json(await apiTestService.run(context.req.valid('json'))),
  )
  .post('/:projectId/apis/:apiId/test', zValidator('json', apiTestRequestSchema), async (context) =>
    context.json(await apiTestService.run(context.req.valid('json'))),
  )