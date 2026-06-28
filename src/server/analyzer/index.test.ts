import { describe, expect, it } from 'vitest'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'

const analyzer = new EnhancedSqlAnalyzer()

describe('EnhancedSqlAnalyzer', () => {
  it('analyzes SQL with input and global variables', () => {
    const result = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id AND region = $.region',
      dialect: 'postgresql',
    })

    expect(result.dialect).toBe('postgresql')
    expect(result.variableRefs).toHaveLength(2)
    expect(result.variableRefs.map((ref) => ref.fullPath)).toContain('$input.id')
    expect(result.variableRefs.map((ref) => ref.fullPath)).toContain('$.region')
    expect(result.optionalConditions).toHaveLength(0)
  })

  it('generates optional condition index', () => {
    const result = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE status = $input.status?',
      dialect: 'postgresql',
    })

    expect(result.optionalConditions).toHaveLength(1)
    expect(result.optionalConditions[0].variablePath).toBe('__var_0__')
  })

  it('reports undefined variables in diagnostics', () => {
    const result = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.unknown',
      dialect: 'postgresql',
      inputNames: [],
    })

    expect(result.staticDiagnostics).toHaveLength(1)
    expect(result.staticDiagnostics[0].message).toContain('unknown')
  })

  it('handles mixed variable modes in one SQL', () => {
    const result = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id AND status = $input.status? AND page = $input.pageSize!',
      dialect: 'postgresql',
    })

    expect(result.variableRefs).toHaveLength(3)

    const idRef = result.variableRefs.find((ref) => ref.name === 'id')
    expect(idRef?.mode).toBe('required')

    const statusRef = result.variableRefs.find((ref) => ref.name === 'status')
    expect(statusRef?.mode).toBe('optional')

    const pageRef = result.variableRefs.find((ref) => ref.name === 'pageSize')
    expect(pageRef?.mode).toBe('defaulted')
  })

  it('generates BETWEEN optional condition index', () => {
    const result = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE created_at BETWEEN $input.start? AND $input.end?',
      dialect: 'postgresql',
    })

    expect(result.optionalConditions).toHaveLength(2)
    expect(result.optionalConditions[0].conditionType).toBe('between-expr')
    expect(result.optionalConditions[1].conditionType).toBe('between-expr')
  })

  it('produces distinct astPaths for duplicate variable occurrences', () => {
    const result = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id OR parent_id = $input.id',
      dialect: 'postgresql',
    })

    expect(result.variableRefs).toHaveLength(2)
    expect(result.variableRefs[0].fullPath).toBe('$input.id')
    expect(result.variableRefs[1].fullPath).toBe('$input.id')
    expect(result.variableRefs[0].astPath).not.toEqual(result.variableRefs[1].astPath)
  })

  it('changes schemaHash when defaults change', () => {
    const result1 = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id',
      dialect: 'postgresql',
      defaults: { id: 1 },
    })

    const result2 = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id',
      dialect: 'postgresql',
      defaults: { id: 2 },
    })

    expect(result1.schemaHash).not.toBe(result2.schemaHash)
  })
})
