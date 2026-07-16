import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import type { Database, DbSourceTable } from '@/server/infra/db/tables'
import type { DataSource, DataSourceDraft, TestConnectionResult } from '@/shared/contracts/data-source.contract'

type DbSourceRow = Selectable<DbSourceTable>

/** DB 行（snake_case + Date + null）→ 契约（camelCase + ISO + undefined）。审计字段不进契约。 */
function rowToDataSource(row: DbSourceRow): DataSource {
  return {
    id: row.id,
    name: row.name,
    dialect: row.dialect,
    host: row.host,
    port: row.port,
    database: row.database,
    username: row.username,
    password: row.password,
    description: row.description ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * DataSource repository —— Kysely 实现。
 *
 * 语义对齐内存版：`save` 为 upsert（保留 created_at）；`remove` 改为软删除（`deleted_at` 置位，
 * list/get 过滤，二次 remove 返回 false——可观测行为与内存硬删一致）。
 *
 * 安全说明：`password` 当前按原样存取（与内存版一致，demo seed 用 `******` 占位）。
 * db-model.md §6 要求加密存储 + 返回脱敏，属后续安全加固项，未在本次实现。
 */
export class DataSourceRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(): Promise<DataSource[]> {
    const rows = await this.db
      .selectFrom('db_source')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(rowToDataSource)
  }

  async get(dataSourceId: string): Promise<DataSource | undefined> {
    const row = await this.db
      .selectFrom('db_source')
      .selectAll()
      .where('id', '=', dataSourceId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? rowToDataSource(row) : undefined
  }

  async save(draft: DataSourceDraft): Promise<DataSource> {
    const id = draft.id ?? createId('ds')
    const existing = await this.get(id)

    if (existing) {
      await this.db
        .updateTable('db_source')
        .set({
          name: draft.name,
          dialect: draft.dialect,
          host: draft.host,
          port: draft.port,
          database: draft.database,
          username: draft.username,
          password: draft.password,
          description: draft.description ?? null,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute()
    } else {
      const now = new Date()
      await this.db
        .insertInto('db_source')
        .values({
          id,
          name: draft.name,
          dialect: draft.dialect,
          host: draft.host,
          port: draft.port,
          database: draft.database,
          username: draft.username,
          password: draft.password,
          description: draft.description ?? null,
          created_at: now,
          updated_at: now,
        })
        .execute()
    }

    const saved = await this.get(id)
    if (!saved) {
      throw new Error(`[data-source] save 后未找到数据源 ${id}`)
    }
    return saved
  }

  async remove(dataSourceId: string): Promise<boolean> {
    const existing = await this.get(dataSourceId)
    if (!existing) return false

    await this.db
      .updateTable('db_source')
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where('id', '=', dataSourceId)
      .execute()
    return true
  }

  /**
   * 连接测试（占位实现）：仅校验 host/database 非空并返回随机延迟，未真正连接业务库。
   * 真实探测待接入 KnexRegistry 后实现；不访问平台库，故保持同步。
   */
  testConnection(draft: DataSourceDraft): TestConnectionResult {
    const latencyMs = 20 + Math.floor(Math.random() * 80)

    if (!draft.host.trim() || !draft.database.trim()) {
      return {
        success: false,
        message: '连接失败：请填写主机地址和数据库名称',
        latencyMs,
      }
    }

    return {
      success: true,
      message: `连接成功（${draft.dialect} @ ${draft.host}:${draft.port}）`,
      latencyMs,
    }
  }
}