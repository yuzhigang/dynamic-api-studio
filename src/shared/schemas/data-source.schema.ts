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
export type DataSourceSchemaColumn = {
  name: string
  dataType: string
  /** varchar/char 长度。 */
  length?: number | null
  /** numeric 精度。 */
  precision?: number | null
  /** numeric 标度。 */
  scale?: number | null
  nullable: boolean
  isPrimaryKey: boolean
  /** 列默认值（原始表达式，如 `now()`、`'active'`、`1`）；null 表示无默认。 */
  defaultValue?: string | null
  /** 自增/serial/identity。 */
  autoIncrement?: boolean
  /** 列序号（从 1）。 */
  ordinalPosition?: number
  comment?: string
}

/** 外键定义（db_schema.foreign_keys 数组元素）。 */
export type DataSourceSchemaForeignKey = {
  name: string
  columns: string[]
  refSchema?: string | null
  refTable: string
  refColumns: string[]
  onDelete?: string | null
  onUpdate?: string | null
}

/** 索引定义（db_schema.indexes 数组元素）。 */
export type DataSourceSchemaIndex = {
  name: string
  columns: string[]
  unique: boolean
  primary: boolean
}

/** 数据源 schema 的一张表/视图。 */
export type DataSourceSchemaTable = {
  name: string
  comment?: string
  columns: DataSourceSchemaColumn[]
  foreignKeys?: DataSourceSchemaForeignKey[]
  indexes?: DataSourceSchemaIndex[]
}

/** 数据源 schema：表/列结构，驱动 SQL 编辑器补全与 schema 详情。 */
export type DataSourceSchema = {
  datasourceId: string
  tables: DataSourceSchemaTable[]
}
