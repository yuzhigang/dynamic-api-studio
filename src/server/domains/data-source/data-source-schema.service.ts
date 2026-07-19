import type { Kysely } from 'kysely'

import { createId } from '@/lib/id'
import { jsonbArray } from '@/server/infra/db/repository-helpers'
import type { Database } from '@/server/infra/db/tables'
import type { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { toKnexConfig } from '@/server/workflow/datasource-config'
import type { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { DatabaseIntrospector } from '@/server/domains/data-source/database-introspector'
import type {
  DataSourceSchema,
  DataSourceSchemaColumn,
  DataSourceSchemaForeignKey,
  DataSourceSchemaIndex,
  DataSourceSchemaTable,
} from '@/shared/contracts/data-source.contract'

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000

/**
 * 数据源 schema 服务：返回业务数据源的表/列/主键结构，驱动 SQL 编辑器补全与「Schema」详情 tab。
 *
 * 流程：先读 `db_schema` 缓存（updated_at + TTL 判定新鲜度）→ 命中则直接返回；
 * 否则取数据源配置 → 经 KnexRegistry 连业务库 → `DatabaseIntrospector` 探测 → 落 `db_schema` 缓存 → 返回。
 *
 * 当前探测仅支持 PostgreSQL（见 database-introspector.ts）；其它方言抛「暂不支持」。
 * 注释、外键、索引本轮不探测（db_schema 列已就绪，后续补）。
 */
export class DataSourceSchemaService {
  constructor(
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly knexRegistry: KnexRegistry,
    private readonly db: Kysely<Database>,
    private readonly introspector: DatabaseIntrospector = new DatabaseIntrospector(),
    private readonly cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
  ) {}

  async getDataSourceSchema(datasourceId: string): Promise<DataSourceSchema> {
    const cached = await this.readCache(datasourceId)
    if (cached) return { datasourceId, tables: cached }

    const ds = await this.dataSourceRepository.get(datasourceId)
    if (!ds) return { datasourceId, tables: [] }

    const knex = this.knexRegistry.getOrCreate(toKnexConfig(ds))
    const schema = await this.introspector.introspect(knex, ds.dialect, datasourceId)
    await this.writeCache(datasourceId, schema)
    return schema
  }

  private async readCache(datasourceId: string): Promise<DataSourceSchemaTable[] | null> {
    const rows = await this.db
      .selectFrom('db_source_metadata')
      .selectAll()
      .where('db_source_id', '=', datasourceId)
      .execute()
    if (rows.length === 0) return null

    const maxUpdated = rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), rows[0].updated_at)
    if (Date.now() - maxUpdated.getTime() > this.cacheTtlMs) return null

    return rows.map((r) => ({
      name: r.object_name,
      schemaName: r.schema_name ?? undefined,
      objectType: r.object_type,
      comment: r.comment ?? undefined,
      columns: (r.columns as DataSourceSchemaColumn[]) ?? [],
      foreignKeys: (r.foreign_keys as DataSourceSchemaForeignKey[] | null) ?? undefined,
      indexes: (r.indexes as DataSourceSchemaIndex[] | null) ?? undefined,
    }))
  }

  private async writeCache(datasourceId: string, schema: DataSourceSchema): Promise<void> {
    // 全量刷新：先删该数据源的旧行，再插新行。
    await this.db.deleteFrom('db_source_metadata').where('db_source_id', '=', datasourceId).execute()
    const now = new Date()
    for (const table of schema.tables) {
      await this.db
        .insertInto('db_source_metadata')
        .values({
          id: createId('db_source_metadata'),
          db_source_id: datasourceId,
          schema_name: table.schemaName ?? null,
          object_type: table.objectType ?? 'table',
          object_name: table.name,
          columns: jsonbArray(table.columns) as never,
          foreign_keys: table.foreignKeys ? jsonbArray(table.foreignKeys) : null,
          indexes: table.indexes ? jsonbArray(table.indexes) : null,
          comment: table.comment ?? null,
          created_at: now,
          updated_at: now,
        })
        .execute()
    }
  }
}