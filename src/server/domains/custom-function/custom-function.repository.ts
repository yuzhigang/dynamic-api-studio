import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import { jsonbArray } from '@/server/infra/db/repository-helpers'
import type { CustomFunctionTable, Database } from '@/server/infra/db/tables'
import type {
  CustomFunction,
  CustomFunctionDraft,
} from '@/shared/contracts/custom-function.contract'

type CustomFunctionRow = Selectable<CustomFunctionTable>

function rowToCustomFunction(row: CustomFunctionRow): CustomFunction {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    scope: row.scope,
    name: row.name,
    label: row.label ?? undefined,
    language: row.language,
    inputSchema: (row.inputSchema ?? []) as CustomFunction['inputSchema'],
    body: row.body,
    outputSchema: (row.outputSchema ?? []) as CustomFunction['outputSchema'],
    description: row.description ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * CustomFunction repository —— Kysely 实现。
 *
 * 同时支持 scope='global' 与 scope='project'；项目级查询限定 project_id。
 * `save` 为 upsert；`remove` 软删除；同 scope+project 内 name 唯一。
 */
export class CustomFunctionRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async listByProject(projectId: string): Promise<CustomFunction[]> {
    const rows = await this.db
      .selectFrom('custom_function')
      .selectAll()
      .where('scope', '=', 'project')
      .where('project_id', '=', projectId)
      .where('deleted_at', 'is', null)
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(rowToCustomFunction)
  }

  async listGlobal(): Promise<CustomFunction[]> {
    const rows = await this.db
      .selectFrom('custom_function')
      .selectAll()
      .where('scope', '=', 'global')
      .where('deleted_at', 'is', null)
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(rowToCustomFunction)
  }

  async get(functionId: string): Promise<CustomFunction | undefined> {
    const row = await this.db
      .selectFrom('custom_function')
      .selectAll()
      .where('id', '=', functionId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? rowToCustomFunction(row) : undefined
  }

  async save(projectId: string | undefined, draft: CustomFunctionDraft): Promise<CustomFunction> {
    const id = draft.id ?? createId('cf')
    const scope = draft.scope ?? 'project'
    await this.assertNameUnique(scope, projectId ?? null, draft.name, id)

    const existing = await this.get(id)
    const now = new Date()

    if (existing) {
      await this.db
        .updateTable('custom_function')
        .set({
          scope,
          project_id: scope === 'project' ? projectId ?? null : null,
          name: draft.name,
          label: draft.label ?? null,
          language: draft.language,
          inputSchema: jsonbArray(draft.inputSchema) as never,
          body: draft.body,
          outputSchema: jsonbArray(draft.outputSchema) as never,
          description: draft.description ?? null,
          updated_at: now,
        })
        .where('id', '=', id)
        .execute()
    } else {
      await this.db
        .insertInto('custom_function')
        .values({
          id,
          scope,
          project_id: scope === 'project' ? projectId ?? null : null,
          name: draft.name,
          label: draft.label ?? null,
          language: draft.language,
          inputSchema: jsonbArray(draft.inputSchema) as never,
          body: draft.body,
          outputSchema: jsonbArray(draft.outputSchema) as never,
          description: draft.description ?? null,
          created_at: now,
          updated_at: now,
        })
        .execute()
    }

    const saved = await this.get(id)
    if (!saved) {
      throw new Error(`[custom-function] save 后未找到函数 ${id}`)
    }
    return saved
  }

  async remove(functionId: string): Promise<boolean> {
    const existing = await this.get(functionId)
    if (!existing) return false

    await this.db
      .updateTable('custom_function')
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where('id', '=', functionId)
      .execute()
    return true
  }

  private async assertNameUnique(
    scope: CustomFunctionDraft['scope'],
    projectId: string | null,
    name: string,
    id: string,
  ): Promise<void> {
    let query = this.db
      .selectFrom('custom_function')
      .select('id')
      .where('scope', '=', scope)
      .where('name', '=', name)
      .where('id', '<>', id)
      .where('deleted_at', 'is', null)

    if (scope === 'project') {
      query = query.where('project_id', '=', projectId ?? '')
    } else {
      query = query.where('project_id', 'is', null)
    }

    const conflict = await query.executeTakeFirst()
    if (conflict) {
      throw new Error(`函数名「${name}」已存在`)
    }
  }
}
