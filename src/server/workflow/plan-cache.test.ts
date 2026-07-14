import { describe, expect, it, vi } from 'vitest'
import { PlanCache } from '@/server/workflow/plan-cache'
import type { EnhancedSqlAnalyzer } from '@/server/analyzer'
import type { CompiledSqlPlan } from '@/server/analyzer/types'
import type { DataSource } from '@/shared/contracts/data-source.contract'

const pg: DataSource = {
  id: 'ds1', name: 'pg', dialect: 'postgresql', host: 'h', port: 5432, database: 'd',
  username: 'u', password: 'p', createdAt: 't', updatedAt: 't',
}
const symbols = { inputNames: [], globalNames: [], localNames: [], defaults: {} }

function fakePlan(sourceHash: string, schemaHash = 'sh'): CompiledSqlPlan {
  return {
    sourceHash, schemaHash, dialect: 'postgresql', processedSql: 'SELECT 1', varMap: {},
    ast: { type: 'select' }, variableRefs: [], aliasMap: {}, optionalConditions: [],
    staticDiagnostics: [], references: [],
  }
}

function analyzerReturning(plan: CompiledSqlPlan) {
  return { analyze: vi.fn(() => plan), getStatementType: vi.fn() } as unknown as EnhancedSqlAnalyzer
}

const step = { id: 's1', kind: 'sql-query' as const, title: 'q', outputVariable: 'rows', sql: 'SELECT 1' }

describe('PlanCache', () => {
  it('compiles on first access and reuses on second', () => {
    const analyzer = analyzerReturning(fakePlan('h1'))
    const cache = new PlanCache(analyzer)
    const ctx = { dataSource: pg }

    const a = cache.getOrCompile(step, symbols, ctx)
    const b = cache.getOrCompile(step, symbols, ctx)
    expect(analyzer.analyze).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('recompiles when the SQL changes (new sourceHash)', () => {
    let plan = fakePlan('h1')
    const analyzer = analyzerReturning(plan)
    const cache = new PlanCache(analyzer)

    cache.getOrCompile(step, symbols, { dataSource: pg })
    plan = fakePlan('h2')
    ;(analyzer.analyze as unknown as ReturnType<typeof vi.fn>).mockReturnValue(plan)
    const stepChanged = { ...step, sql: 'SELECT 2' }
    cache.getOrCompile(stepChanged, symbols, { dataSource: pg })

    expect(analyzer.analyze).toHaveBeenCalledTimes(2)
  })

  it('recompiles when schemaHash changes for the same SQL', () => {
    const analyzer = analyzerReturning(fakePlan('h1', 'sh1'))
    const cache = new PlanCache(analyzer)
    const ctx = { dataSource: pg }

    cache.getOrCompile(step, symbols, ctx)
    ;(analyzer.analyze as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fakePlan('h1', 'sh2'))
    const changedSymbols = { ...symbols, inputNames: ['newParam'] }
    cache.getOrCompile(step, changedSymbols, ctx)

    expect(analyzer.analyze).toHaveBeenCalledTimes(2)
  })
})