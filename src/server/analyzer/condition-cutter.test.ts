import { describe, expect, it } from 'vitest'
import { parseSql } from '@/server/analyzer/parser-wrapper'
import { preprocessSql } from '@/server/analyzer/variable-extractor'
import { buildOptionalConditionIndex } from '@/server/analyzer/condition-cutter'

describe('buildOptionalConditionIndex', () => {
  function analyze(sql: string) {
    const { processedSql, varMap } = preprocessSql(sql)
    const ast = parseSql(processedSql, 'postgresql')
    return buildOptionalConditionIndex(ast, varMap)
  }

  it('indexes optional AND condition', () => {
    const sql = 'SELECT * FROM users WHERE status = $input.status?'
    const result = analyze(sql)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      variablePath: '__var_0__',
      conditionType: 'and-condition',
    })
    expect(result[0].astPath).toBeInstanceOf(Array)
    expect(result[0].astPath.length).toBeGreaterThan(0)
  })

  it('indexes optional BETWEEN condition with sibling', () => {
    const sql = 'SELECT * FROM users WHERE created_at BETWEEN $input.start? AND $input.end?'
    const result = analyze(sql)
    expect(result).toHaveLength(2)

    const startEntry = result.find((r) => r.variablePath === '__var_0__')
    const endEntry = result.find((r) => r.variablePath === '__var_1__')

    expect(startEntry).toBeDefined()
    expect(startEntry).toMatchObject({
      conditionType: 'between-expr',
      siblingVariablePath: '__var_1__',
    })

    expect(endEntry).toBeDefined()
    expect(endEntry).toMatchObject({
      conditionType: 'between-expr',
      siblingVariablePath: '__var_0__',
    })

    // Both should point to the same binary_expr (BETWEEN)
    expect(startEntry!.astPath).toEqual(endEntry!.astPath)
  })

  it('does not index required variables', () => {
    const sql = 'SELECT * FROM users WHERE status = $input.status'
    const result = analyze(sql)
    expect(result).toHaveLength(0)
  })

  it('does not index defaulted variables', () => {
    const sql = 'SELECT * FROM users WHERE status = $input.status!'
    const result = analyze(sql)
    expect(result).toHaveLength(0)
  })

  it('indexes optional OR block', () => {
    const sql = 'SELECT * FROM users WHERE status = $input.status? OR region = $input.region?'
    const result = analyze(sql)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      conditionType: 'or-block',
    })
    expect(result[1]).toMatchObject({
      conditionType: 'or-block',
    })
    // Both should point to the same OR binary_expr
    expect(result[0].astPath).toEqual(result[1].astPath)
  })

  it('indexes optional variables inside IN clauses', () => {
    const sql = 'SELECT * FROM users WHERE status IN ($input.status?)'
    const { processedSql, varMap } = preprocessSql(sql)
    const ast = parseSql(processedSql, 'postgresql')
    const index = buildOptionalConditionIndex(ast, varMap)
    expect(index).toHaveLength(1)
    expect(index[0]).toMatchObject({ variablePath: '__var_0__', conditionType: 'and-condition' })
  })

  it('indexes nested optional conditions correctly', () => {
    const sql = 'SELECT * FROM users WHERE (a = $input.a? AND b = 1) OR c = 2'
    const { processedSql, varMap } = preprocessSql(sql)
    const ast = parseSql(processedSql, 'postgresql')
    const index = buildOptionalConditionIndex(ast, varMap)
    expect(index).toHaveLength(1)
    expect(index[0]).toMatchObject({ variablePath: '__var_0__', conditionType: 'and-condition' })
  })
})
