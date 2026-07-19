import { describe, expect, test } from 'vitest'

import type { RequestParam } from '@/shared/contracts/api-definition.contract'

import { buildRequestBodyTemplate, validateRequestBody } from './request-body-utils'

function param(
  overrides: Partial<RequestParam> & Pick<RequestParam, 'name' | 'type'>,
): RequestParam {
  return {
    id: overrides.id ?? overrides.name,
    name: overrides.name,
    location: overrides.location ?? 'body',
    type: overrides.type,
    required: overrides.required ?? false,
    example: overrides.example,
    description: overrides.description,
  }
}

describe('buildRequestBodyTemplate', () => {
  test('only includes body params, excluding query and header', () => {
    const result = buildRequestBodyTemplate([
      param({ name: 'page', type: 'integer', location: 'query' }),
      param({ name: 'token', type: 'string', location: 'header' }),
      param({ name: 'keyword', type: 'string', location: 'body' }),
    ])

    expect(result).toEqual({ keyword: '' })
  })

  test('uses type-appropriate defaults when example is absent', () => {
    const result = buildRequestBodyTemplate([
      param({ name: 's', type: 'string' }),
      param({ name: 'i', type: 'integer' }),
      param({ name: 'd', type: 'decimal' }),
      param({ name: 'b', type: 'boolean' }),
      param({ name: 'o', type: 'object' }),
      param({ name: 'a', type: 'array' }),
    ])

    expect(result).toEqual({ s: '', i: 0, d: 0, b: false, o: {}, a: [] })
  })

  test('parses example values according to the param type', () => {
    const result = buildRequestBodyTemplate([
      param({ name: 's', type: 'string', example: 'hello' }),
      param({ name: 'i', type: 'integer', example: '42' }),
      param({ name: 'd', type: 'decimal', example: '1.5' }),
      param({ name: 'b', type: 'boolean', example: 'true' }),
      param({ name: 'o', type: 'object', example: '{"a":1}' }),
      param({ name: 'a', type: 'array', example: '[1,2]' }),
    ])

    expect(result).toEqual({ s: 'hello', i: 42, d: 1.5, b: true, o: { a: 1 }, a: [1, 2] })
  })

  test('falls back to the type default when the example cannot be parsed', () => {
    const result = buildRequestBodyTemplate([
      param({ name: 'i', type: 'integer', example: 'not-a-number' }),
      param({ name: 'o', type: 'object', example: '{broken' }),
    ])

    expect(result).toEqual({ i: 0, o: {} })
  })
})

describe('validateRequestBody', () => {
  const params: RequestParam[] = [
    param({ name: 'keyword', type: 'string', required: true }),
    param({ name: 'page', type: 'integer' }),
    param({ name: 'tags', type: 'array' }),
  ]

  test('returns null for a well-formed object', () => {
    expect(validateRequestBody({ keyword: 'abc', page: 1, tags: [] }, params)).toBeNull()
  })

  test('rejects a non-object payload', () => {
    expect(validateRequestBody([1, 2, 3], params)).toMatch(/对象/)
  })

  test('reports a missing required param by name', () => {
    const error = validateRequestBody({ page: 1 }, params)
    expect(error).toContain('keyword')
  })

  test('treats a null required value as missing', () => {
    const error = validateRequestBody({ keyword: null }, params)
    expect(error).toContain('keyword')
  })

  test('reports a type mismatch by name', () => {
    const error = validateRequestBody({ keyword: 'abc', page: 'one' }, params)
    expect(error).toContain('page')
  })

  test('allows unknown keys when required params are satisfied', () => {
    expect(validateRequestBody({ keyword: 'abc', extra: 1 }, params)).toBeNull()
  })
})
