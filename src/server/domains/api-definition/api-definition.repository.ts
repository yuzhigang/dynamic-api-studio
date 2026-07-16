import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import { jsonbArray } from '@/server/infra/db/repository-helpers'
import type { ApiTable, Database } from '@/server/infra/db/tables'
import type { ApiDefinitionDraft, ApiDefinitionSummary } from '@/shared/contracts/api-definition.contract'
import type { ApiLocalVariable, RequestParam, SchemaField, WorkflowStep } from '@/shared/schemas/api-definition.schema'

type ApiRow = Selectable<ApiTable>
type ApiSummaryRow = Pick<ApiRow, 'id' | 'project_id' | 'name' | 'path' | 'method' | 'status' | 'updated_at'>

function rowToSummary(row: ApiSummaryRow): ApiDefinitionSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    path: row.path,
    method: row.method,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  }
}

function rowToDraft(row: ApiRow): ApiDefinitionDraft {
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    name: row.name,
    path: row.path,
    method: row.method,
    tags: row.tags ?? [],
    permissions: row.permissions ?? [],
    requireAuth: row.require_auth,
    description: row.description ?? undefined,
    bodyContentType: row.body_content_type ?? 'json',
    requestParams: (row.request_params ?? []) as RequestParam[],
    responseSchema: (row.response_schema ?? []) as SchemaField[],
    localVariables: (row.local_variables ?? []) as ApiLocalVariable[],
    workflowSteps: (row.workflow_steps ?? []) as WorkflowStep[],
  }
}

/**
 * ApiDefinition repository —— Kysely 实现。
 *
 * 语义对齐内存版：
 *  - `list(projectId)` 返回 Summary（不含大 jsonb，轻量）；`get` 返回完整 Draft；`listPublished` 返回所有已发布 Draft。
 *  - `save` 为 upsert（onConflict id），返回 `{ id, status }`（与内存版一致的极简回执，非完整 Draft）。
 *  - `isPathMethodUnique` 在已发布集合中查 (path, method)，可排除自身。
 *
 * jsonb 数组列（tags/permissions/request_params/response_schema/local_variables/workflow_steps）写库用 `jsonbArray`。
 * FK：project_id→project.id（项目须存在）；UNIQUE(project_id, method, path) 由 DB 强制。
 */
export class ApiDefinitionRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(projectId: string): Promise<ApiDefinitionSummary[]> {
    const rows = await this.db
      .selectFrom('api')
      .select(['id', 'project_id', 'name', 'path', 'method', 'status', 'updated_at'])
      .where('project_id', '=', projectId)
      .where('deleted_at', 'is', null)
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(rowToSummary)
  }

  async get(projectId: string, apiId: string): Promise<ApiDefinitionDraft | undefined> {
    const row = await this.db
      .selectFrom('api')
      .selectAll()
      .where('id', '=', apiId)
      .where('project_id', '=', projectId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? rowToDraft(row) : undefined
  }

  async save(projectId: string, draft: ApiDefinitionDraft): Promise<{ id: string; status: string }> {
    const id = draft.id ?? createId('api')
    const now = new Date()
    await this.db
      .insertInto('api')
      .values({
        id,
        project_id: projectId,
        name: draft.name,
        path: draft.path,
        method: draft.method,
        status: draft.status,
        body_content_type: draft.bodyContentType,
        tags: jsonbArray(draft.tags),
        permissions: jsonbArray(draft.permissions),
        require_auth: draft.requireAuth,
        description: draft.description ?? null,
        request_params: jsonbArray(draft.requestParams),
        response_schema: jsonbArray(draft.responseSchema),
        local_variables: jsonbArray(draft.localVariables),
        workflow_steps: jsonbArray(draft.workflowSteps),
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          project_id: projectId,
          name: draft.name,
          path: draft.path,
          method: draft.method,
          status: draft.status,
          body_content_type: draft.bodyContentType,
          tags: jsonbArray(draft.tags),
          permissions: jsonbArray(draft.permissions),
          require_auth: draft.requireAuth,
          description: draft.description ?? null,
          request_params: jsonbArray(draft.requestParams),
          response_schema: jsonbArray(draft.responseSchema),
          local_variables: jsonbArray(draft.localVariables),
          workflow_steps: jsonbArray(draft.workflowSteps),
          updated_at: now,
        }),
      )
      .execute()
    return { id, status: draft.status }
  }

  async listPublished(): Promise<ApiDefinitionDraft[]> {
    const rows = await this.db
      .selectFrom('api')
      .selectAll()
      .where('status', '=', 'published')
      .where('deleted_at', 'is', null)
      .execute()
    return rows.map(rowToDraft)
  }

  async isPathMethodUnique(path: string, method: ApiDefinitionDraft['method'], exceptId?: string): Promise<boolean> {
    const baseQuery = this.db
      .selectFrom('api')
      .select('id')
      .where('status', '=', 'published')
      .where('path', '=', path)
      .where('method', '=', method)
      .where('deleted_at', 'is', null)
    const query = exceptId ? baseQuery.where('id', '<>', exceptId) : baseQuery
    const conflict = await query.executeTakeFirst()
    return !conflict
  }
}