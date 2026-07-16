import type { Kysely, Selectable } from 'kysely'

import { createId } from '@/lib/id'
import { jsonbArray, jsonbValue } from '@/server/infra/db/repository-helpers'
import type { ApiInvocationLogTable, Database } from '@/server/infra/db/tables'
import type { HttpMethod } from '@/shared/enums/http-method'
import type { InvocationLog, InvocationLogStatus } from '@/modules/invocation-log/types/invocation-log'

type LogRow = Selectable<ApiInvocationLogTable>

function rowToInvocationLog(row: LogRow): InvocationLog {
  return {
    id: row.id,
    invokedAt: row.invoked_at.toISOString(),
    method: row.method,
    apiName: row.api_name ?? undefined,
    path: row.path,
    statusCode: row.status_code ?? 0,
    status: row.status as InvocationLogStatus,
    durationMs: row.duration_ms,
  }
}

export type InvocationLogWriteInput = {
  kind: 'test' | 'invoke'
  apiId?: string
  projectId?: string
  invokedAt: Date
  method: HttpMethod
  path: string
  apiName?: string
  statusCode?: number
  status: InvocationLogStatus
  durationMs: number
  requestParams?: unknown
  responseBody?: unknown
  errorDetail?: string
  steps?: unknown[]
}

export type InvocationLogQueryFilters = {
  apiName?: string
  method?: HttpMethod
  status?: InvocationLogStatus
  statusCode?: number
  startDate?: string
  endDate?: string
}

/**
 * API 调用日志 repository —— api_invocation_log（只追加，无软删除）。
 *
 * - `write`：插入一条日志。jsonb 通用值（request_params/response_body）用 `jsonbValue`（兼容对象/数组/原始）；
 *   steps（数组）用 `jsonbArray`。
 * - `query`：按 apiName（api_name/path ilike 模糊）/method/status/statusCode 精确 + 日期区间过滤，分页。
 *   日期用 UTC 边界（`{date}T00:00:00Z` 起、`{endDate+1天}` 止），与 mock 的「日期部分闭区间」语义一致且时区无关。
 */
export class InvocationLogRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async write(input: InvocationLogWriteInput): Promise<void> {
    await this.db
      .insertInto('api_invocation_log')
      .values({
        id: createId('inv'),
        api_id: input.apiId ?? null,
        project_id: input.projectId ?? null,
        kind: input.kind,
        invoked_at: input.invokedAt,
        method: input.method,
        path: input.path,
        api_name: input.apiName ?? null,
        status_code: input.statusCode ?? null,
        status: input.status,
        duration_ms: input.durationMs,
        request_params: input.requestParams === undefined ? null : jsonbValue(input.requestParams),
        response_body: input.responseBody === undefined ? null : jsonbValue(input.responseBody),
        error_detail: input.errorDetail ?? null,
        steps: input.steps ? jsonbArray(input.steps) : null,
        created_at: input.invokedAt,
      })
      .execute()
  }

  async query(
    filters: InvocationLogQueryFilters,
    page: number,
    pageSize: number,
  ): Promise<{ items: InvocationLog[]; total: number; page: number; pageSize: number }> {
    let base = this.db.selectFrom('api_invocation_log')
    if (filters.apiName) {
      const kw = `%${filters.apiName}%`
      base = base.where((eb) => eb.or([eb('api_name', 'ilike', kw), eb('path', 'ilike', kw)]))
    }
    if (filters.method) base = base.where('method', '=', filters.method)
    if (filters.status) base = base.where('status', '=', filters.status)
    if (filters.statusCode != null) base = base.where('status_code', '=', filters.statusCode)
    if (filters.startDate) base = base.where('invoked_at', '>=', new Date(`${filters.startDate}T00:00:00.000Z`))
    if (filters.endDate) {
      const endExclusive = new Date(Date.parse(`${filters.endDate}T00:00:00.000Z`) + 86_400_000)
      base = base.where('invoked_at', '<', endExclusive)
    }

    const totalRow = await base.select(this.db.fn.countAll().as('total')).executeTakeFirst()
    const total = Number(totalRow?.total ?? 0)

    const rows = await base
      .selectAll()
      .orderBy('invoked_at', 'desc')
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute()

    return { items: rows.map(rowToInvocationLog), total, page, pageSize }
  }
}