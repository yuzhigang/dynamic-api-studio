import type { Kysely } from 'kysely'
import { sql } from 'kysely'

import type { Database } from '@/server/infra/db/tables'

/**
 * project 与数据源解耦：
 *  - project 加 db_source_id（可空），一个 db_source 可被多个 project 引用
 *  - db_schema 重命名为 db_source_metadata（真实数据源元数据缓存）
 *  - 新建 db_schema 表作为项目级数据模型，归属 project
 */
export async function up(db: Kysely<Database>): Promise<void> {
  // 1. project 添加 db_source_id
  await db.schema
    .alterTable('project')
    .addColumn('db_source_id', 'varchar(36)', (c) =>
      c.references('db_source.id').onDelete('set null'),
    )
    .execute()
  await db.schema
    .createIndex('project_db_source_id_idx')
    .on('project')
    .column('db_source_id')
    .execute()

  // 2. 将现有 db_schema 重命名为 db_source_metadata
  await db.schema.alterTable('db_schema').renameTo('db_source_metadata').execute()

  // 3. 调整原 db_schema 索引名以匹配新表名
  await db.schema.dropIndex('db_schema_source_id_idx').ifExists().execute()
  await db.schema
    .createIndex('db_source_metadata_source_id_idx')
    .on('db_source_metadata')
    .column('db_source_id')
    .execute()

  await db.schema.dropIndex('db_schema_source_schema_table_uidx').ifExists().execute()
  await db.schema
    .createIndex('db_source_metadata_source_schema_table_uidx')
    .on('db_source_metadata')
    .columns(['db_source_id', 'schema_name', 'object_name'])
    .unique()
    .execute()

  // 4. 新建项目级 db_schema 表
  await db.schema
    .createTable('db_schema')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('project_id', 'varchar(36)', (c) =>
      c.notNull().references('project.id').onDelete('cascade'),
    )
    .addColumn('db_source_id', 'varchar(36)', (c) =>
      c.references('db_source.id').onDelete('set null'),
    )
    .addColumn('schema_name', 'varchar(128)')
    .addColumn('object_type', 'varchar(16)', (c) => c.notNull())
    .addColumn('object_name', 'varchar(128)', (c) => c.notNull())
    .addColumn('columns', 'jsonb', (c) => c.notNull())
    .addColumn('foreign_keys', 'jsonb')
    .addColumn('indexes', 'jsonb')
    .addColumn('comment', 'text')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema
    .createIndex('db_schema_project_id_idx')
    .on('db_schema')
    .column('project_id')
    .execute()
  await db.schema
    .createIndex('db_schema_project_object_uidx')
    .on('db_schema')
    .columns(['project_id', 'schema_name', 'object_name'])
    .unique()
    .execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  // 4. 删除新建的项目级 db_schema
  await db.schema.dropIndex('db_schema_project_object_uidx').ifExists().execute()
  await db.schema.dropIndex('db_schema_project_id_idx').ifExists().execute()
  await db.schema.dropTable('db_schema').ifExists().execute()

  // 3. 恢复索引名
  await db.schema
    .dropIndex('db_source_metadata_source_schema_table_uidx')
    .ifExists()
    .execute()
  await db.schema
    .createIndex('db_schema_source_schema_table_uidx')
    .on('db_source_metadata')
    .columns(['db_source_id', 'schema_name', 'object_name'])
    .unique()
    .execute()

  await db.schema.dropIndex('db_source_metadata_source_id_idx').ifExists().execute()
  await db.schema
    .createIndex('db_schema_source_id_idx')
    .on('db_source_metadata')
    .column('db_source_id')
    .execute()

  // 2. 恢复表名
  await db.schema.alterTable('db_source_metadata').renameTo('db_schema').execute()

  // 1. 删除 project.db_source_id
  await db.schema.dropIndex('project_db_source_id_idx').ifExists().execute()
  await db.schema.alterTable('project').dropColumn('db_source_id').execute()
}
