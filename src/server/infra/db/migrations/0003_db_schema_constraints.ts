import type { Kysely } from 'kysely'

import type { Database } from '@/server/infra/db/tables'

/**
 * db_schema 增强表级元数据：外键、索引、表注释。
 *
 * 列结构（columns jsonb 内容）同时增强——默认值、长度、精度/标度、自增、列序号等
 * （见 db-model.md §6 / DataSourceSchemaColumn）；columns 是 jsonb，内容结构变更无需 DDL。
 * 本迁移只加表级新列。
 */
export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable('db_schema').addColumn('foreign_keys', 'jsonb').execute()
  await db.schema.alterTable('db_schema').addColumn('indexes', 'jsonb').execute()
  await db.schema.alterTable('db_schema').addColumn('comment', 'text').execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable('db_schema').dropColumn('comment').execute()
  await db.schema.alterTable('db_schema').dropColumn('indexes').execute()
  await db.schema.alterTable('db_schema').dropColumn('foreign_keys').execute()
}