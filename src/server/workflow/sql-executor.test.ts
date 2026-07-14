import { describe, expect, it, vi } from 'vitest'
import type { Knex } from 'knex'
import { createVariableContext } from '@/server/analyzer/types'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { executeSql } from '@/server/workflow/sql-executor'
import type { PlanCache, WorkflowSymbols } from '@/server/workflow/plan-cache'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { WorkflowStep } from '@/shared/schemas/api-definition.schema'

const pg: DataSource = {
  id: 'ds1', name: 'pg', dialect: 'postgresql', host: 'h', port: 5432, database: 'd',
  username: 'u', password: 'p', createdAt: 't', updatedAt: 't',
}
const symbols: WorkflowSymbols = { inputNames: [], globalNames: [], localNames: [], defaults: {} }

const realPlan = new EnhancedSqlAnalyzer().analyze({
  sql: 'SELECT 1', dialect: 'postgresql',
  inputNames: [], globalNames: [], localNames: [], defaults: {},
})

function ctxWith(localRows: unknown[]) {
  const c = createVariableContext()
  c.set('local', 'rows', { value: localRows, type: 'array' })
  return c
}

function fakePlanCache() {
  return { getOrCompile: vi.fn(() => realPlan) } as unknown as PlanCache
}

function knexReturning(rawResult: unknown) {
  const raw = vi.fn().mockResolvedValue(rawResult)
  const knex = { raw } as unknown as Knex
  return { knex, raw }
}

const step = (overrides: Partial<WorkflowStep> = {}): WorkflowStep => ({
  id: 's1', kind: 'sql-query', title: 'q', outputVariable: 'rows', datasourceId: 'ds1', sql: 'SELECT 1', ...overrides,
})

describe('executeSql', () => {
  it('renders, executes via knex.raw, and returns the row array (multipleRows default)', async () => {
    const { knex, raw } = knexReturning({ rows: [{ id: 1 }, { id: 2 }] })
    const getDataSource = vi.fn(() => pg)
    const knexRegistry = { getOrCreate: vi.fn(() => knex) } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    const result = await executeSql(step(), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache() })

    expect(raw).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('returns the first row when multipleRows is false', async () => {
    const { knex } = knexReturning({ rows: [{ id: 1 }, { id: 2 }] })
    const getDataSource = vi.fn(() => pg)
    const knexRegistry = { getOrCreate: vi.fn(() => knex) } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    const result = await executeSql(step({ multipleRows: false }), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache() })

    expect(result).toEqual({ id: 1 })
  })

  it('returns null when multipleRows is false and there are no rows', async () => {
    const { knex } = knexReturning({ rows: [] })
    const getDataSource = vi.fn(() => pg)
    const knexRegistry = { getOrCreate: vi.fn(() => knex) } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    const result = await executeSql(step({ multipleRows: false }), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache() })

    expect(result).toBeNull()
  })

  it('uses trx.raw when a transaction is provided', async () => {
    const { knex } = knexReturning({ rows: [{ id: 1 }] })
    const trxRaw = vi.fn().mockResolvedValue({ rows: [{ id: 9 }] })
    const trx = { raw: trxRaw } as unknown as Knex.Transaction
    const getDataSource = vi.fn(() => pg)
    const knexRegistry = { getOrCreate: vi.fn(() => knex) } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    const result = await executeSql(step(), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache(), trx })

    expect(trxRaw).toHaveBeenCalledTimes(1)
    expect(knex.raw as unknown).not.toHaveBeenCalled()
    expect(result).toEqual([{ id: 9 }])
  })

  it('throws when the data source is missing', async () => {
    const getDataSource = vi.fn(() => undefined)
    const knexRegistry = { getOrCreate: vi.fn() } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    await expect(executeSql(step(), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache() })).rejects.toThrow(/数据源/)
  })
})