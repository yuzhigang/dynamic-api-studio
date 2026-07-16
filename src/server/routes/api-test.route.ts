import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { invocationLogRepository } from '@/server/domains/api-runtime/runtime-wiring'
import { platformDb } from '@/server/infra/db/db'
import { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'
import { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import { apiTestRequestSchema } from '@/shared/contracts/api-definition.contract'

const dataSourceRepository = new DataSourceRepository(platformDb)
const service = new ApiTestService(
  (id) => dataSourceRepository.get(id),
  {
    globalVariableService: new GlobalVariableService(new GlobalVariableRepository(platformDb)),
    projectVariableService: new ProjectVariableService(new ProjectVariableRepository(platformDb)),
  },
  invocationLogRepository,
)

export const apiTestRoute = new Hono().post(
  '/run',
  zValidator('json', apiTestRequestSchema),
  async (context) => context.json(await service.run(context.req.valid('json'))),
)