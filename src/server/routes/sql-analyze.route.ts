import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { EnhancedSqlAnalyzer } from '@/server/analyzer'

const analyzeRequestSchema = z.object({
  sql: z.string(),
  dialect: z.enum(['postgresql', 'mysql', 'sqlserver']).optional(),
})

const analyzer = new EnhancedSqlAnalyzer()

export const sqlAnalyzeRoute = new Hono().post(
  '/analyze',
  zValidator('json', analyzeRequestSchema),
  (context) => context.json(analyzer.analyze(context.req.valid('json'))),
)
