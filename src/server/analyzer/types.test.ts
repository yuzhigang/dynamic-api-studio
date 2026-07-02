import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'

describe('VariableContext', () => {
  it('stores and retrieves values by scope and name', () => {
    const context = createVariableContext()
    context.set('local', 'orders', { value: [{ id: 1 }], type: 'array', itemType: 'object' })
    expect(context.get('local', 'orders')?.value).toEqual([{ id: 1 }])
    expect(context.has('local', 'orders')).toBe(true)
    expect(context.keys('local')).toContain('orders')
  })
})
