import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import type { Database, DbMigrationTable } from '@/server/infra/db/tables'
import type {
  DbMigration,
  DbMigrationDraft,
} from '@/shared/contracts/db-migration.contract'

type DbMigrationRow = Selectable<DbMigrationTable>

function rowToDbMigration(row: DbMigrationRow): DbMigration {
  return {
    id: row.id,
    projectId: row.project_id,
    dbSchemaId: row.db_schema_id ?? undefined,
    status: row.status,
    sql: row.sql,
    generatedFromSnapshot: row.generated_from_snapshot as DbMigration['generatedFromSnapshot'],
    errorMessage: row.error_message ?? undefined,
    appliedAt: row.applied_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export class DbMigrationRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async listByProject(projectId: string): Promise<DbMigration[]> {
    const rows = await this.db
      .selectFrom('db_migration')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(rowToDbMigration)
  }

  async get(projectId: string, migrationId: string): Promise<DbMigration | undefined> {
    const row = await this.db
      .selectFrom('db_migration')
      .selectAll()
      .where('id', '=', migrationId)
      .where('project_id', '=', projectId)
      .executeTakeFirst()
    return row ? rowToDbMigration(row) : undefined
  }

  async create(draft: DbMigrationDraft): Promise<DbMigration> {
    const id = createId('db_migration')
    const now = new Date()

    await this.db
      .insertInto('db_migration')
      .values({
        id,
        project_id: draft.projectId,
        db_schema_id: draft.dbSchemaId ?? null,
        status: 'draft',
        sql: draft.sql,
        generated_from_snapshot: draft.generatedFromSnapshot as never,
        created_at: now,
        updated_at: now,
      })
      .execute()

    const saved = await this.get(draft.projectId, id)
    if (!saved) {
      throw new Error(`[db-migration] create 后未找到迁移记录 ${id}`)
    }
    return saved
  }
}
