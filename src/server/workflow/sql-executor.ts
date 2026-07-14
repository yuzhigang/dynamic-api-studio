import type { Knex } from 'knex'

import type { VariableContext } from '@/server/analyzer/types'
import { renderFromPlan } from '@/server/analyzer/render-from-plan'
import type { WorkflowStep } from '@/shared/schemas/api-definition.schema'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { bindVariableValues } from '@/server/workflow/variable-binder'
import { toKnexConfig } from '@/server/workflow/datasource-config'
import { normalizeResult } from '@/server/workflow/normalize-result'
import type { PlanCache, WorkflowSymbols } from '@/server/workflow/plan-cache'

const DEFAULT_TIMEOUT_MS = 30_000

export type SqlExecutorDeps = {
  knexRegistry: KnexRegistry
  getDataSource: (id: string) => DataSource | undefined
}

export type SqlExecutorOptions = {
  symbols: WorkflowSymbols
  planCache: PlanCache
  trx?: Knex.Transaction
}

export async function executeSql(
  step: WorkflowStep,
  context: VariableContext,
  deps: SqlExecutorDeps,
  options: SqlExecutorOptions,
): Promise<unknown> {
  const dataSource = deps.getDataSource(step.datasourceId ?? '')
  if (!dataSource) throw new Error(`数据源 ${step.datasourceId ?? ''} 不存在`)

  const plan = options.planCache.getOrCompile(step, options.symbols, { dataSource })
  const rendered = renderFromPlan(plan, bindVariableValues(context))
  const paramValues = rendered.params.map((p) => p.value) as Knex.RawBinding[]

  const knex = deps.knexRegistry.getOrCreate(toKnexConfig(dataSource))
  const executor = options.trx ?? knex
  // knex.raw returns a thenable builder exposing .timeout() in production;
  // test mocks may return a plain Promise without it, so call .timeout only if present.
  const rawBuilder = (executor as Knex).raw(rendered.sql, paramValues) as unknown as Promise<unknown> & {
    timeout?: (ms: number, opts: { cancel: boolean }) => unknown
  }
  rawBuilder.timeout?.(DEFAULT_TIMEOUT_MS, { cancel: true })
  const raw = await rawBuilder

  const client = toKnexConfig(dataSource).client
  const rows = normalizeResult(raw, client)

  return step.multipleRows === false ? (rows[0] ?? null) : rows
}