import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { platformDb } from '@/server/infra/db/db'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { DataSourceSchemaService } from '@/server/domains/data-source/data-source-schema.service'
import { DbMigrationRepository } from '@/server/domains/db-migration/db-migration.repository'
import { DbMigrationService } from '@/server/domains/db-migration/db-migration.service'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { ProjectDbSchemaRepository } from '@/server/domains/project-db-schema/project-db-schema.repository'
import { ProjectRepository } from '@/server/domains/project/project.repository'
import { generateMigrationRequestSchema } from '@/shared/contracts/db-migration.contract'

const knexRegistry = new KnexRegistry()
const projectRepository = new ProjectRepository(platformDb)
const dataSourceRepository = new DataSourceRepository(platformDb)
const dataSourceSchemaService = new DataSourceSchemaService(
  dataSourceRepository,
  knexRegistry,
  platformDb,
)
const projectDbSchemaRepository = new ProjectDbSchemaRepository(platformDb)
const dbMigrationRepository = new DbMigrationRepository(platformDb)
const dbMigrationService = new DbMigrationService(
  projectRepository,
  dataSourceRepository,
  dataSourceSchemaService,
  projectDbSchemaRepository,
  dbMigrationRepository,
  knexRegistry,
)

export const projectDbMigrationRoute = new Hono()
  .get('/', async (context) => {
    const projectId = context.req.param('projectId')!
    return context.json(await dbMigrationRepository.listByProject(projectId))
  })
  .get('/:migrationId', async (context) => {
    const projectId = context.req.param('projectId')!
    const migrationId = context.req.param('migrationId')!
    const found = await dbMigrationRepository.get(projectId, migrationId)
    return found ? context.json(found) : context.json({ message: '迁移记录不存在' }, 404)
  })
  .post(
    '/generate',
    zValidator('json', generateMigrationRequestSchema.optional().default({})),
    async (context) => {
      const projectId = context.req.param('projectId')!
      const request = context.req.valid('json')
      const migration = await dbMigrationService.generateMigration(projectId, request)
      return context.json(migration)
    },
  )
