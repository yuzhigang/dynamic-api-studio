import { z } from 'zod'

export const dialectSchema = z.enum([
  'postgresql',
  'mysql',
  'oracle',
  'sqlserver',
  'tdengine',
])

export type Dialect = z.infer<typeof dialectSchema>

export const dataSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dialect: dialectSchema,
  host: z.string(),
  port: z.number().int().nonnegative(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type DataSource = z.infer<typeof dataSourceSchema>

export const dataSourceDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '请输入数据源名称'),
  dialect: dialectSchema,
  host: z.string(),
  port: z.number().int().nonnegative(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  description: z.string().optional(),
})

export type DataSourceDraft = z.infer<typeof dataSourceDraftSchema>

export const testConnectionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  latencyMs: z.number().int().nonnegative(),
})

export type TestConnectionResult = z.infer<typeof testConnectionResultSchema>
