import { Hono } from 'hono'

import { MetadataService } from '@/server/domains/metadata/metadata.service'

const service = new MetadataService()

export const metadataRoute = new Hono().get('/:datasourceId', (context) =>
  context.json(service.getDatasourceMetadata(context.req.param('datasourceId'))),
)
