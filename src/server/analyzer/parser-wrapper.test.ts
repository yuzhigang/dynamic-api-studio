import { describe, expect, it } from 'vitest'
import { parseSql, stringifyAst, toParserDialect } from '@/server/analyzer/parser-wrapper'
import type { SqlDialect } from '@/server/analyzer/types'

function firstAst(ast: ReturnType<typeof parseSql>) {
  return Array.isArray(ast) ? ast[0] : ast
}

describe('parser-wrapper', () => {
  it('parses postgresql SQL', () => {
    const ast = parseSql('SELECT * FROM users WHERE id = 1', 'postgresql')
    expect(ast).toBeDefined()
    expect(firstAst(ast).type).toBe('select')
  })

  it('handles multi-statement SQL as AST array', () => {
    const ast = parseSql('SELECT 1; SELECT 2', 'postgresql')
    expect(Array.isArray(ast)).toBe(true)
    if (Array.isArray(ast)) {
      expect(ast).toHaveLength(2)
    }
  })

  it('throws on invalid SQL', () => {
    expect(() => parseSql('SELECT * FROM', 'postgresql')).toThrow()
  })

  it('maps dialect names to parser dialect', () => {
    expect(toParserDialect('postgresql')).toBe('PostgreSQL')
    expect(toParserDialect('mysql')).toBe('MySQL')
    expect(toParserDialect('oracle')).toBe('PostgreSQL')
    expect(toParserDialect('sqlserver')).toBe('TransactSQL')
  })

  it('stringifies AST back to SQL', () => {
    const sql = 'SELECT * FROM users WHERE id = 1'
    const ast = parseSql(sql, 'postgresql')
    expect(stringifyAst(ast, 'postgresql').toLowerCase()).toContain('select')
  })

  it('parses SQL in all supported dialects', () => {
    const dialects: SqlDialect[] = ['postgresql', 'mysql', 'oracle', 'sqlserver']
    for (const dialect of dialects) {
      const ast = parseSql('SELECT * FROM users WHERE id = 1', dialect)
      expect(firstAst(ast).type).toBe('select')
    }
  })
})
