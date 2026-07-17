/* eslint-disable @typescript-eslint/no-explicit-any --
 * 迁移需要同时引用旧表名 `function`（已不在 Database 类型中）和新表名 `custom_function`，
 * 使用 Kysely<any> 是最直接且安全的方式。
 */
import type { Kysely } from 'kysely'

/**
 * function → custom_function 重命名，并同步字段：
 *  - 新增 `scope`（global | project）
 *  - `params` → `inputSchema`
 *  - `return_type` → `outputSchema`
 * 同时重命名索引以匹配新表名。
 */
export async function up(db: Kysely<any>): Promise<void> {
  // 1. 重命名表
  await db.schema.alterTable('function').renameTo('custom_function').execute()

  // 2. 新增 scope 列（先给默认值以兼容旧行，再 drop default 对齐 NOT NULL 无默认值）
  await db.schema
    .alterTable('custom_function')
    .addColumn('scope', 'varchar(16)', (c) => c.notNull().defaultTo('project'))
    .execute()
  await db.schema
    .alterTable('custom_function')
    .alterColumn('scope', (c) => c.dropDefault())
    .execute()

  // 3. 重命名字段
  await db.schema
    .alterTable('custom_function')
    .renameColumn('params', 'inputSchema')
    .execute()
  await db.schema
    .alterTable('custom_function')
    .renameColumn('return_type', 'outputSchema')
    .execute()

  // 4. 重命名索引
  await db.schema.dropIndex('function_project_id_idx').ifExists().execute()
  await db.schema
    .createIndex('custom_function_project_id_idx')
    .on('custom_function')
    .column('project_id')
    .execute()

  await db.schema.dropIndex('function_project_name_uidx').ifExists().execute()
  await db.schema
    .createIndex('custom_function_project_name_uidx')
    .on('custom_function')
    .columns(['project_id', 'name'])
    .unique()
    .execute()

  await db.schema.dropIndex('function_deleted_at_idx').ifExists().execute()
  await db.schema
    .createIndex('custom_function_deleted_at_idx')
    .on('custom_function')
    .column('deleted_at')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // 1. 恢复索引名
  await db.schema.dropIndex('custom_function_deleted_at_idx').ifExists().execute()
  await db.schema
    .createIndex('function_deleted_at_idx')
    .on('custom_function')
    .column('deleted_at')
    .execute()

  await db.schema.dropIndex('custom_function_project_name_uidx').ifExists().execute()
  await db.schema
    .createIndex('function_project_name_uidx')
    .on('custom_function')
    .columns(['project_id', 'name'])
    .unique()
    .execute()

  await db.schema.dropIndex('custom_function_project_id_idx').ifExists().execute()
  await db.schema
    .createIndex('function_project_id_idx')
    .on('custom_function')
    .column('project_id')
    .execute()

  // 2. 恢复字段名
  await db.schema
    .alterTable('custom_function')
    .renameColumn('outputSchema', 'return_type')
    .execute()
  await db.schema
    .alterTable('custom_function')
    .renameColumn('inputSchema', 'params')
    .execute()

  // 3. 删除 scope 列
  await db.schema.alterTable('custom_function').dropColumn('scope').execute()

  // 4. 恢复表名
  await db.schema.alterTable('custom_function').renameTo('function').execute()
}
