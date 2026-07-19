import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import { jsonbArray } from '@/server/infra/db/repository-helpers'
import type { Database, DbSchemaTable } from '@/server/infra/db/tables'
import type {
  ProjectDbSchema,
  SyncProjectDbSchemaFromSource,
} from '@/shared/contracts/project-db-schema.contract'
import type { DataSourceSchemaTable } from '@/shared/contracts/data-source.contract'

type DbSchemaRow = Selectable<DbSchemaTable>

function rowToProjectDbSchema(row: DbSchemaRow): ProjectDbSchema {
  return {
    id: row.id,
    projectId: row.project_id,
    dbSourceId: row.db_source_id ?? undefined,
    schemaName: row.schema_name ?? undefined,
    objectType: row.object_type,
    objectName: row.object_name,
    columns: (row.columns ?? []) as ProjectDbSchema['columns'],
    foreignKeys: (row.foreign_keys ?? undefined) as ProjectDbSchema['foreignKeys'],
    indexes: (row.indexes ?? undefined) as ProjectDbSchema['indexes'],
    comment: row.comment ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export class ProjectDbSchemaRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async get(projectId: string, dbSchemaId: string): Promise<ProjectDbSchema | undefined> {
    const row = await this.db
      .selectFrom('db_schema')
      .selectAll()
      .where('id', '=', dbSchemaId)
      .where('project_id', '=', projectId)
      .executeTakeFirst()
    return row ? rowToProjectDbSchema(row) : undefined
  }

  async listByProject(projectId: string): Promise<ProjectDbSchema[]> {
    const rows = await this.db
      .selectFrom('db_schema')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('object_name', 'asc')
      .execute()
    return rows.map(rowToProjectDbSchema)
  }

  async syncFromSource(
    projectId: string,
    dbSourceId: string,
    payload: SyncProjectDbSchemaFromSource,
    sourceObjects: DataSourceSchemaTable[],
  ): Promise<ProjectDbSchema[]> {
    const selectedNames = new Set(payload.objectNames)
    const selectedObjects = sourceObjects.filter((item) => selectedNames.has(item.name))

    if (selectedObjects.length === 0) {
      return []
    }

    const now = new Date()

    // 先删除该项目下已存在的同名对象（全量覆盖所选对象）
    await this.db
      .deleteFrom('db_schema')
      .where('project_id', '=', projectId)
      .where('object_type', 'in', ['table', 'view'])
      .where(
        'object_name',
        'in',
        selectedObjects.map((item) => item.name),
      )
      .execute()

    const created: ProjectDbSchema[] = []
    for (const item of selectedObjects) {
      const row = await this.db
        .insertInto('db_schema')
        .values({
          id: createId('db_schema'),
          project_id: projectId,
          db_source_id: dbSourceId,
          schema_name: item.schemaName ?? null,
          object_type: item.objectType ?? 'table',
          object_name: item.name,
          columns: jsonbArray(item.columns) as never,
          foreign_keys: item.foreignKeys ? jsonbArray(item.foreignKeys) : null,
          indexes: item.indexes ? jsonbArray(item.indexes) : null,
          comment: item.comment ?? null,
          created_at: now,
          updated_at: now,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
      created.push(rowToProjectDbSchema(row))
    }

    return created
  }

  async delete(projectId: string, dbSchemaId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('db_schema')
      .where('id', '=', dbSchemaId)
      .where('project_id', '=', projectId)
      .executeTakeFirst()
    return Number(result.numDeletedRows) > 0
  }
}
