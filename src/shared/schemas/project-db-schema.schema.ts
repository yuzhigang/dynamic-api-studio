import { z } from 'zod'

import {
  dataSourceSchemaColumnSchema,
  dataSourceSchemaForeignKeySchema,
  dataSourceSchemaIndexSchema,
} from '@/shared/schemas/data-source.schema'

export const projectDbSchemaObjectTypeSchema = z.enum(['table', 'view'])

/** 项目级 db_schema 单行契约：从数据源同步或设计优先创建的数据模型。 */
export const projectDbSchemaSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  dbSourceId: z.string().optional(),
  schemaName: z.string().optional(),
  objectType: projectDbSchemaObjectTypeSchema,
  objectName: z.string().min(1),
  columns: z.array(dataSourceSchemaColumnSchema),
  foreignKeys: z.array(dataSourceSchemaForeignKeySchema).optional(),
  indexes: z.array(dataSourceSchemaIndexSchema).optional(),
  comment: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ProjectDbSchema = z.infer<typeof projectDbSchemaSchema>

/** 从数据源选择对象同步到项目 db_schema 的请求体。 */
export const syncProjectDbSchemaFromSourceSchema = z.object({
  objectNames: z.array(z.string().min(1)).min(1, '至少选择一个表或视图'),
})

export type SyncProjectDbSchemaFromSource = z.infer<typeof syncProjectDbSchemaFromSourceSchema>
