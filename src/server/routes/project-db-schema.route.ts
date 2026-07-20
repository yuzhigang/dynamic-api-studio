import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { platformDb } from '@/server/infra/db/db'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { DataSourceSchemaService } from '@/server/domains/data-source/data-source-schema.service'
import { JsonSchemaRepository } from '@/server/domains/json-schema/json-schema.repository'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { ProjectDbSchemaRepository } from '@/server/domains/project-db-schema/project-db-schema.repository'
import { ProjectDbSchemaService } from '@/server/domains/project-db-schema/project-db-schema.service'
import { CrudGeneratorService } from '@/server/domains/crud-generator/crud-generator.service'
import { ProjectRepository } from '@/server/domains/project/project.repository'
import { syncProjectDbSchemaFromSourceSchema, projectDbSchemaDraftSchema } from '@/shared/contracts/project-db-schema.contract'
import { generateCrudOptionsSchema } from '@/shared/contracts/crud-generation.contract'

const projectRepository = new ProjectRepository(platformDb)
const dataSourceRepository = new DataSourceRepository(platformDb)
const dataSourceSchemaService = new DataSourceSchemaService(
  dataSourceRepository,
  new KnexRegistry(),
  platformDb,
)
const projectDbSchemaRepository = new ProjectDbSchemaRepository(platformDb)
const jsonSchemaRepository = new JsonSchemaRepository(platformDb)
const apiDefinitionRepository = new ApiDefinitionRepository(platformDb)
const projectDbSchemaService = new ProjectDbSchemaService(
  projectDbSchemaRepository,
  projectRepository,
  dataSourceSchemaService,
)
const crudGeneratorService = new CrudGeneratorService(
  projectDbSchemaRepository,
  projectRepository,
  dataSourceRepository,
  jsonSchemaRepository,
  apiDefinitionRepository,
)

export const projectDbSchemaRoute = new Hono()
  .get('/', async (context) => {
    const projectId = context.req.param('projectId')!
    return context.json(await projectDbSchemaService.listByProject(projectId))
  })
  .post('/', zValidator('json', projectDbSchemaDraftSchema), async (context) => {
    const projectId = context.req.param('projectId')!
    const draft = context.req.valid('json')
    return context.json(await projectDbSchemaService.save(projectId, draft))
  })
  .get('/:dbSchemaId', async (context) => {
    const projectId = context.req.param('projectId')!
    const dbSchemaId = context.req.param('dbSchemaId')!
    const found = await projectDbSchemaService.get(projectId, dbSchemaId)
    return found ? context.json(found) : context.json({ message: '数据模型不存在' }, 404)
  })
  .put('/:dbSchemaId', zValidator('json', projectDbSchemaDraftSchema), async (context) => {
    const projectId = context.req.param('projectId')!
    const dbSchemaId = context.req.param('dbSchemaId')!
    const draft = context.req.valid('json')
    return context.json(await projectDbSchemaService.save(projectId, { ...draft, id: dbSchemaId }))
  })
  .get('/source-objects', async (context) => {
    const projectId = context.req.param('projectId')!
    return context.json(await projectDbSchemaService.getSourceObjects(projectId))
  })
  .post(
    '/sync-from-source',
    zValidator('json', syncProjectDbSchemaFromSourceSchema),
    async (context) => {
      const projectId = context.req.param('projectId')!
      const payload = context.req.valid('json')
      return context.json(await projectDbSchemaService.syncFromSource(projectId, payload))
    },
  )
  .post(
    '/:dbSchemaId/generate-crud',
    zValidator('json', generateCrudOptionsSchema.optional().default({})),
    async (context) => {
      const projectId = context.req.param('projectId')!
      const dbSchemaId = context.req.param('dbSchemaId')!
      const options = context.req.valid('json')
      const result = await crudGeneratorService.generate(projectId, dbSchemaId, options)
      return context.json(result)
    },
  )
  .delete('/:dbSchemaId', async (context) => {
    const projectId = context.req.param('projectId')!
    const dbSchemaId = context.req.param('dbSchemaId')!
    const deleted = await projectDbSchemaService.delete(projectId, dbSchemaId)
    return context.json({ success: deleted })
  })
