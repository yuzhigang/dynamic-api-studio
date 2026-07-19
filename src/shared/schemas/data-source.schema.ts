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

/** 数据源 schema 的列定义（对齐 db-model §6 db_schema.columns 结构）。 */
export const dataSourceSchemaColumnSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  length: z.number().int().nullable().optional(),
  precision: z.number().int().nullable().optional(),
  scale: z.number().int().nullable().optional(),
  nullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  defaultValue: z.string().nullable().optional(),
  autoIncrement: z.boolean().optional(),
  ordinalPosition: z.number().int().optional(),
  comment: z.string().optional(),
})

export type DataSourceSchemaColumn = z.infer<typeof dataSourceSchemaColumnSchema>

/** 外键定义（db_schema.foreign_keys 数组元素）。 */
export const dataSourceSchemaForeignKeySchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  refSchema: z.string().nullable().optional(),
  refTable: z.string(),
  refColumns: z.array(z.string()),
  onDelete: z.string().nullable().optional(),
  onUpdate: z.string().nullable().optional(),
})

export type DataSourceSchemaForeignKey = z.infer<typeof dataSourceSchemaForeignKeySchema>

/** 索引定义（db_schema.indexes 数组元素）。 */
export const dataSourceSchemaIndexSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  unique: z.boolean(),
  primary: z.boolean(),
})

export type DataSourceSchemaIndex = z.infer<typeof dataSourceSchemaIndexSchema>

/** 数据源 schema 的一张表/视图。 */
export const dataSourceSchemaTableSchema = z.object({
  name: z.string(),
  schemaName: z.string().optional(),
  objectType: z.enum(['table', 'view']).optional(),
  comment: z.string().optional(),
  columns: z.array(dataSourceSchemaColumnSchema),
  foreignKeys: z.array(dataSourceSchemaForeignKeySchema).optional(),
  indexes: z.array(dataSourceSchemaIndexSchema).optional(),
})

export type DataSourceSchemaTable = z.infer<typeof dataSourceSchemaTableSchema>

/** 数据源 schema：表/列结构，驱动 SQL 编辑器补全与 schema 详情。 */
export const dataSourceSchemaSchema = z.object({
  datasourceId: z.string(),
  tables: z.array(dataSourceSchemaTableSchema),
})

export type DataSourceSchema = z.infer<typeof dataSourceSchemaSchema>
