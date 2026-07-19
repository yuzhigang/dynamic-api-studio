import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import type { Database, ProjectTable } from '@/server/infra/db/tables'
import type { Project, ProjectDraft } from '@/shared/contracts/project.contract'

type ProjectRow = Selectable<ProjectTable>

/**
 * DB 行（snake_case + Date 时间戳 + null）→ 契约（camelCase + ISO 字符串 + undefined）。
 * 审计字段（created_by/updated_by/deleted_at）为 DB 内部，不进入契约。
 */
function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
    status: row.status,
    dbSourceId: row.db_source_id ?? undefined,
    apiCount: row.api_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * Project repository —— 基于 Kysely 的 PostgreSQL 实现。
 *
 * 与原内存实现的语义对齐：
 *  - `list` / `get` 只返回未软删除（`deleted_at is null`）的项目；当前无删除操作，故等价于全部。
 *  - `save` 为 upsert：带 id 且存在 → 更新（保留 status/api_count/created_at；icon/color 缺省时沿用旧值）；
 *    不存在或无 id → 插入（status='active', api_count=0）。
 *  - `archive` 置 status='archived'；不存在返回 undefined。
 *  - `copy` 以新 id 复制为 active、api_count=0 的项目（code 加 `_COPY` 后缀）。
 *
 * 与内存版的差异：`code` 受 DB 唯一约束——重复 copy 同一项目会因 `ORDER_COPY` 冲突报错（符合 db-model.md 设计）。
 */
export class ProjectRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(): Promise<Project[]> {
    const rows = await this.db
      .selectFrom('project')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(rowToProject)
  }

  async get(projectId: string): Promise<Project | undefined> {
    const row = await this.db
      .selectFrom('project')
      .selectAll()
      .where('id', '=', projectId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? rowToProject(row) : undefined
  }

  async save(draft: ProjectDraft): Promise<Project> {
    const id = draft.id ?? createId('project')
    const existing = await this.get(id)

    if (existing) {
      await this.db
        .updateTable('project')
        .set({
          code: draft.code,
          name: draft.name,
          description: draft.description ?? null,
          icon: draft.icon ?? existing.icon ?? null,
          color: draft.color ?? existing.color ?? null,
          db_source_id: draft.dbSourceId ?? existing.dbSourceId ?? null,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute()
    } else {
      await this.db
        .insertInto('project')
        .values({
          id,
          code: draft.code,
          name: draft.name,
          description: draft.description ?? null,
          icon: draft.icon ?? null,
          color: draft.color ?? null,
          db_source_id: draft.dbSourceId ?? null,
          status: 'active',
          api_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute()
    }

    const saved = await this.get(id)
    if (!saved) {
      throw new Error(`[project] save 后未找到项目 ${id}`)
    }
    return saved
  }

  async archive(projectId: string): Promise<Project | undefined> {
    await this.db
      .updateTable('project')
      .set({ status: 'archived', updated_at: new Date() })
      .where('id', '=', projectId)
      .where('deleted_at', 'is', null)
      .execute()
    return this.get(projectId)
  }

  async canCreateApi(projectId: string): Promise<boolean> {
    const project = await this.get(projectId)
    return project?.status === 'active'
  }

  async copy(projectId: string): Promise<Project | undefined> {
    const source = await this.get(projectId)
    if (!source) return undefined

    const newId = createId('project')
    await this.db
      .insertInto('project')
      .values({
        id: newId,
        code: `${source.code}_COPY`,
        name: `${source.name} 副本`,
        description: source.description ?? null,
        icon: source.icon ?? null,
        color: source.color ?? null,
        db_source_id: source.dbSourceId ?? null,
        status: 'active',
        api_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute()

    return this.get(newId)
  }
}