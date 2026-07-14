import { describe, expect, it } from 'vitest'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'

const analyzer = new EnhancedSqlAnalyzer()

function planFor(sql: string) {
  return analyzer.analyze({ sql, dialect: 'postgresql', inputNames: [], globalNames: [], localNames: [] })
}

describe('EnhancedSqlAnalyzer.getStatementType', () => {
  it('detects select', () => {
    expect(analyzer.getStatementType(planFor('SELECT 1'))).toBe('select')
  })

  it('detects insert', () => {
    expect(analyzer.getStatementType(planFor('INSERT INTO t (a) VALUES (1)'))).toBe('insert')
  })

  it('detects update', () => {
    expect(analyzer.getStatementType(planFor('UPDATE t SET a = 1'))).toBe('update')
  })

  it('detects delete', () => {
    expect(analyzer.getStatementType(planFor('DELETE FROM t'))).toBe('delete')
  })
})