import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import type { Database, JsonSchemaTable } from '@/server/infra/db/tables'
import type { JsonSchema, JsonSchemaDraft } from '@/shared/contracts/json-schema.contract'

type JsonSchemaRow = Selectable<JsonSchemaTable>

function rowToJsonSchema(row: JsonSchemaRow): JsonSchema {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    name: row.name,
    kind: row.kind,
    content: row.content as JsonSchema['content'],
    description: row.description ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export class JsonSchemaRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async get(id: string): Promise<JsonSchema | undefined> {
    const row = await this.db
      .selectFrom('json_schema')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? rowToJsonSchema(row) : undefined
  }

  async listByProject(projectId: string): Promise<JsonSchema[]> {
    const rows = await this.db
      .selectFrom('json_schema')
      .selectAll()
      .where('project_id', '=', projectId)
      .where('deleted_at', 'is', null)
      .orderBy('updated_at', 'desc')
      .execute()
    return rows.map(rowToJsonSchema)
  }

  async save(draft: JsonSchemaDraft): Promise<{ id: string }> {
    const id = draft.id ?? createId('json_schema')
    const now = new Date()

    await this.db
      .insertInto('json_schema')
      .values({
        id,
        project_id: draft.projectId,
        name: draft.name,
        kind: draft.kind,
        content: draft.content as never,
        description: draft.description ?? null,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          project_id: draft.projectId,
          name: draft.name,
          kind: draft.kind,
          content: draft.content as never,
          description: draft.description ?? null,
          updated_at: now,
        }),
      )
      .execute()

    return { id }
  }
}
