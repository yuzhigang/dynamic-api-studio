import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import { jsonbArray } from '@/server/infra/db/repository-helpers'
import type { Database, VariableTable } from '@/server/infra/db/tables'
import type { ProjectVariable, ProjectVariableDraft } from '@/shared/contracts/project-variable.contract'

type VariableRow = Selectable<VariableTable>

/** DB 行 → 契约。scope/description 为 DB 内部；project_id 映射为 projectId。 */
function rowToProjectVariable(row: VariableRow): ProjectVariable {
  return {
    id: row.id,
    projectId: row.project_id ?? '',
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
 * ProjectVariable repository —— Kysely 实现（variable 表 scope='project'，project_id=projectId）。
 *
 * 语义对齐内存版：`save(projectId, draft)` 为 upsert（保留 created_at 与 project_id；single/list 互斥清理）；
 * 重名校验限定在 (scope='project', project_id) 内；`remove` 软删除；jsonb 数组 items 写前 `JSON.stringify`。
 */
export class ProjectVariableRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(projectId: string): Promise<ProjectVariable[]> {
    const rows = await this.db
      .selectFrom('variable')
      .selectAll()
      .where('scope', '=', 'project')
      .where('project_id', '=', projectId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(rowToProjectVariable)
  }

  async get(variableId: string): Promise<ProjectVariable | undefined> {
    const row = await this.db
      .selectFrom('variable')
      .selectAll()
      .where('id', '=', variableId)
      .where('scope', '=', 'project')
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? rowToProjectVariable(row) : undefined
  }

  async save(projectId: string, draft: ProjectVariableDraft): Promise<ProjectVariable> {
    const id = draft.id ?? createId('pv')
    await this.assertNameUnique(projectId, draft.name, id)

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
          scope: 'project',
          project_id: projectId,
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
      throw new Error(`[project-variable] save 后未找到变量 ${id}`)
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

  private async assertNameUnique(projectId: string, name: string, id: string): Promise<void> {
    const conflict = await this.db
      .selectFrom('variable')
      .select('id')
      .where('scope', '=', 'project')
      .where('project_id', '=', projectId)
      .where('name', '=', name)
      .where('id', '<>', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (conflict) {
      throw new Error(`变量名「${name}」已存在`)
    }
  }
}