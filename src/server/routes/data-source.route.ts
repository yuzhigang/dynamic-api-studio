import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { DataSourceService } from '@/server/domains/data-source/data-source.service'
import { dataSourceDraftSchema } from '@/shared/contracts/data-source.contract'

export const dataSourceRepository = new DataSourceRepository()

const service = new DataSourceService(dataSourceRepository)

export const dataSourceRoute = new Hono()
  .get('/', (context) => context.json(service.list()))
  .post('/', zValidator('json', dataSourceDraftSchema), (context) =>
    context.json(service.save(context.req.valid('json'))),
  )
  .post('/test-connection', zValidator('json', dataSourceDraftSchema), (context) =>
    context.json(service.testConnection(context.req.valid('json'))),
  )
  .get('/:dataSourceId', (context) => {
    const dataSource = service.get(context.req.param('dataSourceId'))

    return dataSource
      ? context.json(dataSource)
      : context.json({ message: 'DataSource not found' }, 404)
  })
  .put('/:dataSourceId', zValidator('json', dataSourceDraftSchema), (context) =>
    context.json(
      service.save({ ...context.req.valid('json'), id: context.req.param('dataSourceId') }),
    ),
  )
  .delete('/:dataSourceId', (context) => {
    const removed = service.remove(context.req.param('dataSourceId'))

    return removed
      ? context.json({ success: true })
      : context.json({ message: 'DataSource not found' }, 404)
  })
