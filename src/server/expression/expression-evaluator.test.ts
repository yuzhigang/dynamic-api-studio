import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'
import { evalExpression, evalExpressionFromContext } from '@/server/expression/expression-evaluator'

describe('evalExpression', () => {
  it('evaluates arithmetic with input variables', () => {
    const result = evalExpression('($input.pageSize - 1) * $input.pageNo', {
      input: { pageSize: 10, pageNo: 2 },
      global: {},
      local: {},
    })
    expect(result).toBe(18)
  })

  it('calls global functions', () => {
    const result = evalExpression('$.getMin($input.a, $input.b) + 1', {
      input: { a: 5, b: 3 },
      global: { getMin: (a: number, b: number) => Math.min(a, b) },
      local: {},
    })
    expect(result).toBe(4)
  })

  it('uses local variables and input together', () => {
    const result = evalExpression('$basePrice * $input.quantity', {
      input: { quantity: 3 },
      global: {},
      local: { basePrice: 12.5 },
    })
    expect(result).toBe(37.5)
  })

  it('supports object property access', () => {
    const result = evalExpression('$input.user.name + "-" + $.env', {
      input: { user: { name: 'alice' } },
      global: { env: 'prod' },
      local: {},
    })
    expect(result).toBe('alice-prod')
  })

  it('supports array operations', () => {
    const result = evalExpression('$.sum($input.values)', {
      input: { values: [1, 2, 3, 4] },
      global: { sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0) },
      local: {},
    })
    expect(result).toBe(10)
  })

  it('does not confuse $input with bare $identifier', () => {
    const result = evalExpression('$input.x + $other', {
      input: { x: 1 },
      global: {},
      local: { other: 2 },
    })
    expect(result).toBe(3)
  })
})

describe('evalExpressionFromContext', () => {
  it('evaluates expression from VariableContext', () => {
    const context = createVariableContext()
    context.set('input', 'pageSize', { value: 10, type: 'integer' })
    context.set('input', 'pageNo', { value: 2, type: 'integer' })

    const result = evalExpressionFromContext('($input.pageSize - 1) * $input.pageNo', context)
    expect(result).toBe(18)
  })

  it('calls global functions from VariableContext', () => {
    const context = createVariableContext()
    context.set('input', 'a', { value: 5, type: 'integer' })
    context.set('input', 'b', { value: 3, type: 'integer' })
    context.set('global', 'getMin', { value: (a: number, b: number) => Math.min(a, b), type: 'function' })

    const result = evalExpressionFromContext('$.getMin($input.a, $input.b)', context)
    expect(result).toBe(3)
  })

  it('uses local variables from VariableContext', () => {
    const context = createVariableContext()
    context.set('local', 'basePrice', { value: 12.5, type: 'decimal' })
    context.set('input', 'quantity', { value: 3, type: 'integer' })

    const result = evalExpressionFromContext('$basePrice * $input.quantity', context)
    expect(result).toBe(37.5)
  })
})
