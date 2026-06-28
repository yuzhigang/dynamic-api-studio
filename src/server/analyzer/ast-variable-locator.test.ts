import { describe, expect, it } from 'vitest'
import { parseSql } from '@/server/analyzer/parser-wrapper'
import { preprocessSql } from '@/server/analyzer/variable-extractor'
import { locateVariablesInAst } from '@/server/analyzer/ast-variable-locator'

describe('locateVariablesInAst', () => {
  it('finds placeholder positions in preprocessed SQL AST', () => {
    const sql = 'SELECT * FROM users WHERE id = $input.id AND name = $.name'
    const { processedSql } = preprocessSql(sql)
    const ast = parseSql(processedSql, 'postgresql')
    const locations = locateVariablesInAst(ast)

    expect(locations).toHaveLength(2)
    expect(locations.map((loc) => loc.raw)).toEqual(['__var_0__', '__var_1__'])
    expect(locations[0]).toMatchObject({ raw: '__var_0__', astPath: expect.any(Array) })
    expect(locations[1]).toMatchObject({ raw: '__var_1__', astPath: expect.any(Array) })
  })
})
