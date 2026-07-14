import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'
import { bindVariableValues, extractRawValues } from '@/server/workflow/variable-binder'

describe('variable-binder', () => {
  it('extracts raw values by scope', () => {
    const ctx = createVariableContext()
    ctx.set('input', 'id', { value: 42, type: 'integer' })
    ctx.set('global', 'tenant', { value: 't-1', type: 'string' })
    ctx.set('local', 'orders', { value: [{ id: 1 }], type: 'array' })

    expect(extractRawValues(ctx, 'input')).toEqual({ id: 42 })
    expect(extractRawValues(ctx, 'global')).toEqual({ tenant: 't-1' })
    expect(extractRawValues(ctx, 'local')).toEqual({ orders: [{ id: 1 }] })
  })

  it('binds all three scopes for renderFromPlan', () => {
    const ctx = createVariableContext()
    ctx.set('input', 'id', { value: 42, type: 'integer' })
    ctx.set('global', 'tenant', { value: 't-1', type: 'string' })
    ctx.set('local', 'orders', { value: [], type: 'array' })

    expect(bindVariableValues(ctx)).toEqual({
      input: { id: 42 },
      global: { tenant: 't-1' },
      local: { orders: [] },
    })
  })
})