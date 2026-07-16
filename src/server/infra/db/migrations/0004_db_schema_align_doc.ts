import type { Kysely } from 'kysely'
import { sql } from 'kysely'

import type { Database } from '@/server/infra/db/tables'

/**
 * db_schema 对齐 db-model §6：
 *  - `table_name` → `object_name`（对 table|view 更通用）。
 *  - 删除 `introspected_at`（`updated_at` 兼作最后刷新/探测时间）。
 * db_schema 为空表，改名/删列安全。
 */
export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable('db_schema').renameColumn('table_name', 'object_name').execute()
  await db.schema.alterTable('db_schema').dropColumn('introspected_at').execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable('db_schema')
    .addColumn('introspected_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema.alterTable('db_schema').renameColumn('object_name', 'table_name').execute()
}