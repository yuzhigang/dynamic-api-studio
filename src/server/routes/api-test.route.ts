import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import { apiTestRequestSchema } from '@/shared/contracts/api-definition.contract'

const service = new ApiTestService()

export const apiTestRoute = new Hono().post(
  '/run',
  zValidator('json', apiTestRequestSchema),
  (context) => context.json(service.run(context.req.valid('json'))),
)
