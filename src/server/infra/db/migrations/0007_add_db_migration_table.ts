import { sql, type Kysely } from 'kysely'

/**
 * 新增 db_migration 表：记录从项目 db_schema 生成的业务数据源迁移 SQL。
 *
 * 设计文档：db-model.md §12（数据模型与迁移）
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('db_migration')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('project_id', 'varchar(36)', (c) =>
      c.notNull().references('project.id').onDelete('cascade'),
    )
    .addColumn('db_schema_id', 'varchar(36)', (c) => c.references('db_schema.id').onDelete('set null'))
    .addColumn('status', 'varchar(16)', (c) => c.notNull().defaultTo('draft'))
    .addColumn('sql', 'text', (c) => c.notNull())
    .addColumn('generated_from_snapshot', 'jsonb', (c) => c.notNull())
    .addColumn('error_message', 'text')
    .addColumn('applied_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('db_migration_project_id_idx')
    .on('db_migration')
    .column('project_id')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('db_migration_project_id_idx').ifExists().execute()
  await db.schema.dropTable('db_migration').ifExists().execute()
}
