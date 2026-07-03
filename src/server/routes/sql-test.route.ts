import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { renderFromPlan } from '@/server/analyzer/render-from-plan'

const testRequestSchema = z.object({
  sql: z.string(),
  dialect: z.enum(['postgresql', 'mysql', 'sqlserver', 'oracle']).optional(),
  params: z.record(z.unknown()),
  inputNames: z.array(z.string()).optional(),
  globalNames: z.array(z.string()).optional(),
  localNames: z.array(z.string()).optional(),
  localValues: z.record(z.unknown()).optional(),
  globalValues: z.record(z.unknown()).optional(),
  defaults: z.record(z.unknown()).optional(),
})

const analyzer = new EnhancedSqlAnalyzer()

export const sqlTestRoute = new Hono().post(
  '/test',
  zValidator('json', testRequestSchema),
  (context) => {
    const body = context.req.valid('json')
    const plan = analyzer.analyze(body)
    const result = renderFromPlan(plan, {
      input: body.params,
      global: body.globalValues ?? {},
      local: body.localValues ?? {},
    })

    return context.json({
      sql: result.sql,
      params: result.params,
      diagnostics: plan.staticDiagnostics,
    })
  },
)
