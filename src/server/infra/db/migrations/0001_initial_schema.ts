import type { Kysely } from 'kysely'
import { sql } from 'kysely'

import type { Database } from '@/server/infra/db/tables'

/**
 * 初始 schema —— 平台元数据库 10 张表。
 *
 * 权威结构见 db-model.md。本迁移采用方言中立写法（Kysely schema builder），
 * 列类型由 Kysely 映射到 PostgreSQL。
 *
 * 约定：
 *  - 主键 `id` varchar(36)，应用层生成（无 DB 默认）。
 *  - 审计时间列 `created_at` / `updated_at` 使用 `default now()`，由 DB 生成。
 *  - 外键删除策略：从属实体 `ON DELETE CASCADE`；引用型（如 api→json_schema）`ON DELETE SET NULL`。
 *  - 日志/缓存表（api_invocation_log、schedule_task_log、db_schema）不含软删除与 created_by/updated_by。
 *
 * up/down 在依赖顺序上严格对称：up 先建被引用表，down 先删引用方。
 */
export async function up(db: Kysely<Database>): Promise<void> {
  // ---------- 1. project ----------
  await db.schema
    .createTable('project')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('code', 'varchar(64)', (c) => c.notNull().unique())
    .addColumn('name', 'varchar(128)', (c) => c.notNull())
    .addColumn('description', 'text')
    .addColumn('icon', 'varchar(64)')
    .addColumn('color', 'varchar(16)')
    .addColumn('status', 'varchar(16)', (c) => c.notNull().defaultTo('active'))
    .addColumn('api_count', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'varchar(64)')
    .addColumn('updated_by', 'varchar(64)')
    .addColumn('deleted_at', 'timestamptz')
    .execute()
  await db.schema.createIndex('project_status_idx').on('project').column('status').execute()
  await db.schema.createIndex('project_deleted_at_idx').on('project').column('deleted_at').execute()

  // ---------- 2. json_schema ----------
  await db.schema
    .createTable('json_schema')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('project_id', 'varchar(36)', (c) =>
      c.references('project.id').onDelete('cascade'),
    )
    .addColumn('name', 'varchar(128)', (c) => c.notNull())
    .addColumn('kind', 'varchar(32)', (c) => c.notNull())
    .addColumn('content', 'jsonb', (c) => c.notNull())
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'varchar(64)')
    .addColumn('updated_by', 'varchar(64)')
    .addColumn('deleted_at', 'timestamptz')
    .execute()
  await db.schema.createIndex('json_schema_project_id_idx').on('json_schema').column('project_id').execute()
  await db.schema.createIndex('json_schema_kind_idx').on('json_schema').column('kind').execute()
  await db.schema.createIndex('json_schema_deleted_at_idx').on('json_schema').column('deleted_at').execute()

  // ---------- 3. db_source ----------
  await db.schema
    .createTable('db_source')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('name', 'varchar(128)', (c) => c.notNull())
    .addColumn('dialect', 'varchar(16)', (c) => c.notNull())
    .addColumn('host', 'varchar(256)', (c) => c.notNull())
    .addColumn('port', 'integer', (c) => c.notNull())
    .addColumn('database', 'varchar(128)', (c) => c.notNull())
    .addColumn('username', 'varchar(128)', (c) => c.notNull())
    .addColumn('password', 'text', (c) => c.notNull())
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'varchar(64)')
    .addColumn('updated_by', 'varchar(64)')
    .addColumn('deleted_at', 'timestamptz')
    .execute()
  await db.schema.createIndex('db_source_dialect_idx').on('db_source').column('dialect').execute()
  await db.schema.createIndex('db_source_deleted_at_idx').on('db_source').column('deleted_at').execute()

  // ---------- 4. db_schema（缓存，不软删除） ----------
  await db.schema
    .createTable('db_schema')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('db_source_id', 'varchar(36)', (c) =>
      c.notNull().references('db_source.id').onDelete('cascade'),
    )
    .addColumn('schema_name', 'varchar(128)')
    .addColumn('object_type', 'varchar(16)', (c) => c.notNull())
    .addColumn('table_name', 'varchar(128)', (c) => c.notNull())
    .addColumn('columns', 'jsonb', (c) => c.notNull())
    .addColumn('introspected_at', 'timestamptz', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema.createIndex('db_schema_source_id_idx').on('db_schema').column('db_source_id').execute()
  await db.schema
    .createIndex('db_schema_source_schema_table_uidx')
    .on('db_schema')
    .columns(['db_source_id', 'schema_name', 'table_name'])
    .unique()
    .execute()

  // ---------- 5. api ----------
  await db.schema
    .createTable('api')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('project_id', 'varchar(36)', (c) =>
      c.notNull().references('project.id').onDelete('cascade'),
    )
    .addColumn('name', 'varchar(128)', (c) => c.notNull())
    .addColumn('path', 'varchar(256)', (c) => c.notNull())
    .addColumn('method', 'varchar(8)', (c) => c.notNull())
    .addColumn('status', 'varchar(16)', (c) => c.notNull().defaultTo('draft'))
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addColumn('body_content_type', 'varchar(32)')
    .addColumn('request_schema_id', 'varchar(36)', (c) =>
      c.references('json_schema.id').onDelete('set null'),
    )
    .addColumn('response_schema_id', 'varchar(36)', (c) =>
      c.references('json_schema.id').onDelete('set null'),
    )
    .addColumn('workflow_steps', 'jsonb')
    .addColumn('tags', 'jsonb')
    .addColumn('permissions', 'jsonb')
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'varchar(64)')
    .addColumn('updated_by', 'varchar(64)')
    .addColumn('deleted_at', 'timestamptz')
    .execute()
  await db.schema.createIndex('api_project_id_idx').on('api').column('project_id').execute()
  await db.schema
    .createIndex('api_project_method_path_uidx')
    .on('api')
    .columns(['project_id', 'method', 'path'])
    .unique()
    .execute()
  await db.schema.createIndex('api_status_idx').on('api').column('status').execute()
  await db.schema.createIndex('api_deleted_at_idx').on('api').column('deleted_at').execute()

  // ---------- 6. variable ----------
  await db.schema
    .createTable('variable')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('scope', 'varchar(16)', (c) => c.notNull())
    .addColumn('project_id', 'varchar(36)', (c) =>
      c.references('project.id').onDelete('cascade'),
    )
    .addColumn('name', 'varchar(64)', (c) => c.notNull())
    .addColumn('label', 'varchar(128)', (c) => c.notNull())
    .addColumn('kind', 'varchar(16)', (c) => c.notNull())
    .addColumn('value', 'text')
    .addColumn('items', 'jsonb')
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'varchar(64)')
    .addColumn('updated_by', 'varchar(64)')
    .addColumn('deleted_at', 'timestamptz')
    .execute()
  await db.schema.createIndex('variable_scope_idx').on('variable').column('scope').execute()
  await db.schema.createIndex('variable_project_id_idx').on('variable').column('project_id').execute()
  await db.schema
    .createIndex('variable_scope_project_name_uidx')
    .on('variable')
    .columns(['scope', 'project_id', 'name'])
    .unique()
    .execute()
  await db.schema.createIndex('variable_deleted_at_idx').on('variable').column('deleted_at').execute()

  // ---------- 7. function ----------
  await db.schema
    .createTable('function')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('project_id', 'varchar(36)', (c) =>
      c.references('project.id').onDelete('cascade'),
    )
    .addColumn('name', 'varchar(64)', (c) => c.notNull())
    .addColumn('label', 'varchar(128)')
    .addColumn('language', 'varchar(16)', (c) => c.notNull().defaultTo('javascript'))
    .addColumn('params', 'jsonb')
    .addColumn('body', 'text', (c) => c.notNull())
    .addColumn('return_type', 'varchar(32)')
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'varchar(64)')
    .addColumn('updated_by', 'varchar(64)')
    .addColumn('deleted_at', 'timestamptz')
    .execute()
  await db.schema.createIndex('function_project_id_idx').on('function').column('project_id').execute()
  await db.schema
    .createIndex('function_project_name_uidx')
    .on('function')
    .columns(['project_id', 'name'])
    .unique()
    .execute()
  await db.schema.createIndex('function_deleted_at_idx').on('function').column('deleted_at').execute()

  // ---------- 8. api_invocation_log（只追加） ----------
  await db.schema
    .createTable('api_invocation_log')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('api_id', 'varchar(36)', (c) =>
      c.references('api.id').onDelete('set null'),
    )
    .addColumn('project_id', 'varchar(36)', (c) =>
      c.references('project.id').onDelete('set null'),
    )
    .addColumn('kind', 'varchar(16)', (c) => c.notNull())
    .addColumn('invoked_at', 'timestamptz', (c) => c.notNull())
    .addColumn('method', 'varchar(8)', (c) => c.notNull())
    .addColumn('path', 'varchar(256)', (c) => c.notNull())
    .addColumn('api_name', 'varchar(128)')
    .addColumn('status_code', 'integer')
    .addColumn('status', 'varchar(16)', (c) => c.notNull())
    .addColumn('duration_ms', 'integer', (c) => c.notNull())
    .addColumn('request_params', 'jsonb')
    .addColumn('response_body', 'jsonb')
    .addColumn('error_detail', 'text')
    .addColumn('steps', 'jsonb')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema.createIndex('api_invocation_log_api_id_idx').on('api_invocation_log').column('api_id').execute()
  await db.schema.createIndex('api_invocation_log_project_id_idx').on('api_invocation_log').column('project_id').execute()
  await db.schema.createIndex('api_invocation_log_kind_idx').on('api_invocation_log').column('kind').execute()
  await db.schema.createIndex('api_invocation_log_invoked_at_idx').on('api_invocation_log').column('invoked_at').execute()
  await db.schema.createIndex('api_invocation_log_status_idx').on('api_invocation_log').column('status').execute()

  // ---------- 9. schedule_task ----------
  await db.schema
    .createTable('schedule_task')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('name', 'varchar(128)', (c) => c.notNull())
    .addColumn('description', 'text')
    .addColumn('enabled', 'boolean', (c) => c.notNull().defaultTo(true))
    .addColumn('datasource_id', 'varchar(36)', (c) =>
      c.notNull().references('db_source.id').onDelete('cascade'),
    )
    .addColumn('sql', 'text', (c) => c.notNull())
    .addColumn('trigger', 'jsonb', (c) => c.notNull())
    .addColumn('last_run_at', 'timestamptz')
    .addColumn('next_run_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'varchar(64)')
    .addColumn('updated_by', 'varchar(64)')
    .addColumn('deleted_at', 'timestamptz')
    .execute()
  await db.schema.createIndex('schedule_task_datasource_id_idx').on('schedule_task').column('datasource_id').execute()
  await db.schema.createIndex('schedule_task_enabled_idx').on('schedule_task').column('enabled').execute()
  await db.schema.createIndex('schedule_task_next_run_at_idx').on('schedule_task').column('next_run_at').execute()
  await db.schema.createIndex('schedule_task_deleted_at_idx').on('schedule_task').column('deleted_at').execute()

  // ---------- 10. schedule_task_log（只追加） ----------
  await db.schema
    .createTable('schedule_task_log')
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('task_id', 'varchar(36)', (c) =>
      c.notNull().references('schedule_task.id').onDelete('cascade'),
    )
    .addColumn('started_at', 'timestamptz', (c) => c.notNull())
    .addColumn('trigger', 'varchar(16)', (c) => c.notNull())
    .addColumn('status', 'varchar(16)', (c) => c.notNull())
    .addColumn('duration_ms', 'integer')
    .addColumn('affected_rows', 'integer')
    .addColumn('error', 'text')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema.createIndex('schedule_task_log_task_id_idx').on('schedule_task_log').column('task_id').execute()
  await db.schema.createIndex('schedule_task_log_started_at_idx').on('schedule_task_log').column('started_at').execute()
  await db.schema.createIndex('schedule_task_log_status_idx').on('schedule_task_log').column('status').execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  // 按外键反向依赖顺序删除（先删引用方）。
  await db.schema.dropTable('schedule_task_log').ifExists().execute()
  await db.schema.dropTable('schedule_task').ifExists().execute()
  await db.schema.dropTable('api_invocation_log').ifExists().execute()
  await db.schema.dropTable('function').ifExists().execute()
  await db.schema.dropTable('variable').ifExists().execute()
  await db.schema.dropTable('db_schema').ifExists().execute()
  await db.schema.dropTable('db_source').ifExists().execute()
  await db.schema.dropTable('api').ifExists().execute()
  await db.schema.dropTable('json_schema').ifExists().execute()
  await db.schema.dropTable('project').ifExists().execute()
}