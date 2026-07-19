import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { platformDb } from '@/server/infra/db/db'
import { DataSourceSchemaService } from '@/server/domains/data-source/data-source-schema.service'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { ProjectDbSchemaRepository } from '@/server/domains/project-db-schema/project-db-schema.repository'
import { ProjectDbSchemaService } from '@/server/domains/project-db-schema/project-db-schema.service'
import { ProjectRepository } from '@/server/domains/project/project.repository'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { syncProjectDbSchemaFromSourceSchema } from '@/shared/contracts/project-db-schema.contract'

const projectRepository = new ProjectRepository(platformDb)
const dataSourceRepository = new DataSourceRepository(platformDb)
const dataSourceSchemaService = new DataSourceSchemaService(
  dataSourceRepository,
  new KnexRegistry(),
  platformDb,
)
const projectDbSchemaRepository = new ProjectDbSchemaRepository(platformDb)
const projectDbSchemaService = new ProjectDbSchemaService(
  projectDbSchemaRepository,
  projectRepository,
  dataSourceSchemaService,
)

export const projectDbSchemaRoute = new Hono()
  .get('/', async (context) => {
    const projectId = context.req.param('projectId')!
    return context.json(await projectDbSchemaService.listByProject(projectId))
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
  .delete('/:dbSchemaId', async (context) => {
    const projectId = context.req.param('projectId')!
    const dbSchemaId = context.req.param('dbSchemaId')!
    const deleted = await projectDbSchemaService.delete(projectId, dbSchemaId)
    return context.json({ success: deleted })
  })
