import { describe, expect, it } from 'vitest'
import { extractVariablesFromSql } from '@/server/analyzer/variable-extractor'

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
