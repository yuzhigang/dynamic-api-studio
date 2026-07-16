import type { Kysely } from 'kysely'

import type { Database } from '@/server/infra/db/tables'

/**
 * api 表补充内联列：require_auth / request_params / response_schema / local_variables。
 *
 * 当前代码用「内联 JSON」模型（ApiDefinitionDraft 内联 requestParams/responseSchema/localVariables/requireAuth），
 * 非 db-model §3 的可复用 json_schema FK 模型。db-model.md §12.1 已注明「代码现状是内嵌 JSON，迁到可复用模型
 * 需 service 层拆分」——即内联是现状、可复用是未来。故补齐内联列以持久化当前契约；
 * request_schema_id/response_schema_id 暂留空（未来启用可复用模型时再用）。
 */
export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable('api').addColumn('require_auth', 'boolean', (c) => c.notNull().defaultTo(true)).execute()
  await db.schema.alterTable('api').addColumn('request_params', 'jsonb').execute()
  await db.schema.alterTable('api').addColumn('response_schema', 'jsonb').execute()
  await db.schema.alterTable('api').addColumn('local_variables', 'jsonb').execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable('api').dropColumn('local_variables').execute()
  await db.schema.alterTable('api').dropColumn('response_schema').execute()
  await db.schema.alterTable('api').dropColumn('request_params').execute()
  await db.schema.alterTable('api').dropColumn('require_auth').execute()
}