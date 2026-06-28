import { describe, expect, it } from 'vitest'
import { parseSql } from '@/server/analyzer/parser-wrapper'
import { locateVariablesInAst } from '@/server/analyzer/ast-variable-locator'

describe('locateVariablesInAst', () => {
  it('finds variable positions in simple WHERE', () => {
    const sql = 'SELECT * FROM users WHERE id = :input_id AND name = :name'
    const ast = parseSql(sql, 'postgresql')
    const locations = locateVariablesInAst(ast)

    expect(locations).toHaveLength(2)
    expect(locations[0]).toMatchObject({ raw: ':input_id', astPath: expect.any(Array) })
    expect(locations[1]).toMatchObject({ raw: ':name', astPath: expect.any(Array) })
  })
})
