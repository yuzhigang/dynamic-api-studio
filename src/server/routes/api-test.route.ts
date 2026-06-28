import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { apiTestRequestSchema } from '@/shared/contracts/api-definition.contract'

const dataSourceRepository = new DataSourceRepository()
const service = new ApiTestService((id) => dataSourceRepository.get(id))

export const apiTestRoute = new Hono().post(
  '/run',
  zValidator('json', apiTestRequestSchema),
  async (context) => context.json(await service.run(context.req.valid('json'))),
)
