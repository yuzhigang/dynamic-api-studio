import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'

describe('VariableContext', () => {
  it('stores and retrieves values across input, global and local scopes', () => {
    const context = createVariableContext()

    context.set('input', 'pageSize', { value: 10, type: 'integer' })
    context.set('global', 'tenantId', { value: 'acme', type: 'string' })
    context.set('local', 'orders', { value: [{ id: 1 }], type: 'array', itemType: 'object' })

    expect(context.get('input', 'pageSize')?.value).toBe(10)
    expect(context.get('global', 'tenantId')?.value).toBe('acme')
    expect(context.get('local', 'orders')?.value).toEqual([{ id: 1 }])

    expect(context.has('input', 'pageSize')).toBe(true)
    expect(context.has('global', 'tenantId')).toBe(true)
    expect(context.has('local', 'orders')).toBe(true)

    expect(context.keys('input')).toContain('pageSize')
    expect(context.keys('global')).toContain('tenantId')
    expect(context.keys('local')).toContain('orders')
  })

  it('returns undefined and false for missing keys', () => {
    const context = createVariableContext()

    expect(context.get('input', 'missing')).toBeUndefined()
    expect(context.get('global', 'missing')).toBeUndefined()
    expect(context.get('local', 'missing')).toBeUndefined()

    expect(context.has('input', 'missing')).toBe(false)
    expect(context.has('global', 'missing')).toBe(false)
    expect(context.has('local', 'missing')).toBe(false)

    expect(context.keys('input')).toEqual([])
    expect(context.keys('global')).toEqual([])
    expect(context.keys('local')).toEqual([])
  })

  it('produces independent clones with deep-copied values', () => {
    const original = createVariableContext()
    const nested = { items: [{ id: 1 }] }
    original.set('local', 'orders', { value: nested, type: 'object' })

    const cloned = original.clone()

    expect(cloned.get('local', 'orders')?.value).toEqual(nested)
    expect(cloned.get('local', 'orders')?.value).not.toBe(nested)
    ;(cloned.get('local', 'orders')!.value as typeof nested).items.push({ id: 2 })

    expect((original.get('local', 'orders')!.value as typeof nested).items).toHaveLength(1)
    expect((cloned.get('local', 'orders')!.value as typeof nested).items).toHaveLength(2)
  })

  it('merge preserves receiver values and overwrites with other values', () => {
    const receiver = createVariableContext()
    receiver.set('input', 'pageSize', { value: 10, type: 'integer' })
    receiver.set('global', 'tenantId', { value: 'acme', type: 'string' })

    const other = createVariableContext()
    other.set('input', 'pageSize', { value: 20, type: 'integer' })
    other.set('local', 'orders', { value: [{ id: 1 }], type: 'array' })

    const merged = receiver.merge(other)

    expect(merged.get('input', 'pageSize')?.value).toBe(20)
    expect(merged.get('global', 'tenantId')?.value).toBe('acme')
    expect(merged.get('local', 'orders')?.value).toEqual([{ id: 1 }])

    expect(receiver.get('input', 'pageSize')?.value).toBe(10)
    expect(receiver.get('local', 'orders')).toBeUndefined()
  })
})
