import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import { jsonbArray } from '@/server/infra/db/repository-helpers'
import type { Database, VariableTable } from '@/server/infra/db/tables'
import type { GlobalVariable, GlobalVariableDraft } from '@/shared/contracts/global-variable.contract'

type VariableRow = Selectable<VariableTable>

/** DB 行 → 契约。scope/project_id/description 为 DB 内部，不进 GlobalVariable 契约。 */
function rowToGlobalVariable(row: VariableRow): GlobalVariable {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    kind: row.kind,
    value: row.value ?? '',
    items: row.items ?? [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * GlobalVariable repository —— Kysely 实现（variable 表 scope='global'，project_id=NULL）。
 *
 * 语义对齐内存版：`save` 为 upsert（保留 created_at；single 写 value 清 items，list 写 items 清 value）；
 * 重名校验在应用层（DB UNIQUE(scope,project_id,name) 对 project_id=NULL 视 NULL 互异，不强制全局唯一）；
 * `remove` 软删除。jsonb 数组 items 写库前 `JSON.stringify`（见 tables.ts 注释）。
 */
export class GlobalVariableRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(): Promise<GlobalVariable[]> {
    const rows = await this.db
      .selectFrom('variable')
      .selectAll()
      .where('scope', '=', 'global')
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(rowToGlobalVariable)
  }

  async get(variableId: string): Promise<GlobalVariable | undefined> {
    const row = await this.db
      .selectFrom('variable')
      .selectAll()
      .where('id', '=', variableId)
      .where('scope', '=', 'global')
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? rowToGlobalVariable(row) : undefined
  }

  async save(draft: GlobalVariableDraft): Promise<GlobalVariable> {
    const id = draft.id ?? createId('gv')
    await this.assertNameUnique(draft.name, id)

    const existing = await this.get(id)
    const value = draft.kind === 'single' ? draft.value : ''
    const items = draft.kind === 'list' ? draft.items : []

    if (existing) {
      await this.db
        .updateTable('variable')
        .set({
          name: draft.name,
          label: draft.label,
          kind: draft.kind,
          value,
          items: jsonbArray(items),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute()
    } else {
      const now = new Date()
      await this.db
        .insertInto('variable')
        .values({
          id,
          scope: 'global',
          project_id: null,
          name: draft.name,
          label: draft.label,
          kind: draft.kind,
          value,
          items: jsonbArray(items),
          description: null,
          created_at: now,
          updated_at: now,
        })
        .execute()
    }

    const saved = await this.get(id)
    if (!saved) {
      throw new Error(`[global-variable] save 后未找到变量 ${id}`)
    }
    return saved
  }

  async remove(variableId: string): Promise<boolean> {
    const existing = await this.get(variableId)
    if (!existing) return false

    await this.db
      .updateTable('variable')
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where('id', '=', variableId)
      .execute()
    return true
  }

  private async assertNameUnique(name: string, id: string): Promise<void> {
    const conflict = await this.db
      .selectFrom('variable')
      .select('id')
      .where('scope', '=', 'global')
      .where('name', '=', name)
      .where('id', '<>', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (conflict) {
      throw new Error(`变量名「${name}」已存在`)
    }
  }
}