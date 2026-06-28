import { describe, expect, it } from 'vitest'
import { extractVariablesFromSql, preprocessSql } from '@/server/analyzer/variable-extractor'

describe('extractVariablesFromSql', () => {
  it('extracts input variables', () => {
    const result = extractVariablesFromSql('SELECT * FROM t WHERE id = $input.id')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      raw: '$input.id',
      namespace: 'input',
      name: 'id',
      fullPath: '$input.id',
      mode: 'required',
    })
  })

  it('extracts global variables with dot prefix', () => {
    const result = extractVariablesFromSql('SELECT * FROM t WHERE region = $.region')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      raw: '$.region',
      namespace: 'global',
      name: 'region',
      fullPath: '$.region',
      mode: 'required',
    })
  })

  it('detects optional and defaulted modes', () => {
    const result = extractVariablesFromSql('WHERE a = $input.a? AND b = $.b!')
    expect(result).toEqual([
      expect.objectContaining({ raw: '$input.a?', mode: 'optional' }),
      expect.objectContaining({ raw: '$.b!', mode: 'defaulted' }),
    ])
  })

  it('rejects function calls in SQL', () => {
    const result = extractVariablesFromSql('WHERE x = $.getMin(1, 2)')
    expect(result).toHaveLength(0)
  })

  it('does not treat $inputname as $input.name', () => {
    const result = extractVariablesFromSql('WHERE id = $inputname')
    expect(result).toHaveLength(0)
  })
})

describe('preprocessSql', () => {
  it('preprocesses SQL by replacing variables with placeholders', () => {
    const result = preprocessSql('WHERE id = $input.id AND region = $.region?')
    expect(result.processedSql).toBe('WHERE id = :__var_0__ AND region = :__var_1__')
    expect(result.varMap['__var_0__']).toMatchObject({ raw: '$input.id', namespace: 'input' })
    expect(result.varMap['__var_1__']).toMatchObject({ raw: '$.region?', namespace: 'global', mode: 'optional' })
  })

  it('rejects function calls and leaves SQL unchanged', () => {
    const result = preprocessSql('WHERE x = $.getMin(1,2)')
    expect(result.processedSql).toBe('WHERE x = $.getMin(1,2)')
    expect(Object.keys(result.varMap)).toHaveLength(0)
  })

  it('gives different placeholder keys to multiple occurrences of the same variable', () => {
    const result = preprocessSql('WHERE id = $input.id AND other_id = $input.id')
    expect(result.processedSql).toBe('WHERE id = :__var_0__ AND other_id = :__var_1__')
    expect(Object.keys(result.varMap)).toHaveLength(2)
    expect(result.varMap['__var_0__']).toMatchObject({ raw: '$input.id', namespace: 'input' })
    expect(result.varMap['__var_1__']).toMatchObject({ raw: '$input.id', namespace: 'input' })
  })

  it('returns empty varMap for empty SQL', () => {
    const result = preprocessSql('')
    expect(result.processedSql).toBe('')
    expect(Object.keys(result.varMap)).toHaveLength(0)
  })

  it('handles variables at the end of the string', () => {
    const result = preprocessSql('WHERE id = $input.id')
    expect(result.processedSql).toBe('WHERE id = :__var_0__')
    expect(result.varMap['__var_0__']).toMatchObject({ raw: '$input.id', namespace: 'input' })
  })

  it('preprocesses correctly after extractVariablesFromSql has been called', () => {
    extractVariablesFromSql('WHERE a = $input.a')
    const result = preprocessSql('WHERE b = $.b')
    expect(result.processedSql).toBe('WHERE b = :__var_0__')
    expect(result.varMap['__var_0__']).toMatchObject({ raw: '$.b', namespace: 'global' })
  })
})
