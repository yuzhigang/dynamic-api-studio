import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { platformDb } from '@/server/infra/db/db'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { DataSourceSchemaService } from '@/server/domains/data-source/data-source-schema.service'
import { DataSourceService } from '@/server/domains/data-source/data-source.service'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { dataSourceDraftSchema } from '@/shared/contracts/data-source.contract'

export const dataSourceRepository = new DataSourceRepository(platformDb)

const service = new DataSourceService(dataSourceRepository)
const schemaService = new DataSourceSchemaService(dataSourceRepository, new KnexRegistry(), platformDb)

export const dataSourceRoute = new Hono()
  .get('/', async (context) => context.json(await service.list()))
  .post('/', zValidator('json', dataSourceDraftSchema), async (context) =>
    context.json(await service.save(context.req.valid('json'))),
  )
  .post('/test-connection', zValidator('json', dataSourceDraftSchema), (context) =>
    context.json(service.testConnection(context.req.valid('json'))),
  )
  .get('/:dataSourceId/schema', async (context) =>
    context.json(await schemaService.getDataSourceSchema(context.req.param('dataSourceId'))),
  )
  .get('/:dataSourceId', async (context) => {
    const dataSource = await service.get(context.req.param('dataSourceId'))

    return dataSource
      ? context.json(dataSource)
      : context.json({ message: 'DataSource not found' }, 404)
  })
  .put('/:dataSourceId', zValidator('json', dataSourceDraftSchema), async (context) =>
    context.json(
      await service.save({ ...context.req.valid('json'), id: context.req.param('dataSourceId') }),
    ),
  )
  .delete('/:dataSourceId', async (context) => {
    const removed = await service.remove(context.req.param('dataSourceId'))

    return removed
      ? context.json({ success: true })
      : context.json({ message: 'DataSource not found' }, 404)
  })