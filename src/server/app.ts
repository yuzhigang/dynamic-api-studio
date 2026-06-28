import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import type { AppBindings } from '@/server/context'
import { dataSourceRoute } from '@/server/routes/data-source.route'
import { globalVariableRoute } from '@/server/routes/global-variable.route'
import { homeOverviewRoute } from '@/server/routes/home-overview.route'
import { healthRoute } from '@/server/routes/health.route'
import { metadataRoute } from '@/server/routes/metadata.route'
import { projectApiRoute } from '@/server/routes/project-api.route'
import { projectVariableRoute } from '@/server/routes/project-variable.route'
import { projectRoute } from '@/server/routes/project.route'
import { sqlAnalyzeRoute } from '@/server/routes/sql-analyze.route'
import { taskRoute } from '@/server/routes/task.route'

const app = new Hono<AppBindings>().basePath('/api')

app.use('*', logger())
app.use('*', cors())

app
  .route('/health', healthRoute)
  .route('/home', homeOverviewRoute)
  .route('/projects', projectRoute)
  .route('/projects', projectApiRoute)
  .route('/projects', projectVariableRoute)
  .route('/datasources', dataSourceRoute)
  .route('/global-variables', globalVariableRoute)
  .route('/metadata', metadataRoute)
  .route('/sql', sqlAnalyzeRoute)
  .route('/tasks', taskRoute)

app.notFound((context) =>
  context.json(
    {
      message: 'Not Found',
      path: context.req.path,
    },
    404,
  ),
)

app.onError((error, context) => {
  console.error(error)

  return context.json(
    {
      message: error.message,
    },
    500,
  )
})

export type AppType = typeof app
export default app
