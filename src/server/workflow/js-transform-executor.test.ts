import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'
import { executeJsTransform } from '@/server/workflow/js-transform-executor'

function ctxWith({ input = {}, global = {}, local = {} }: { input?: Record<string, unknown>; global?: Record<string, unknown>; local?: Record<string, unknown> }) {
  const c = createVariableContext()
  for (const [k, v] of Object.entries(input)) c.set('input', k, { value: v, type: 'string' })
  for (const [k, v] of Object.entries(global)) c.set('global', k, { value: v, type: 'string' })
  for (const [k, v] of Object.entries(local)) c.set('local', k, { value: v, type: 'array' })
  return c
}

describe('executeJsTransform', () => {
  it('runs a script using bare local names and returns its value', async () => {
    const ctx = ctxWith({ local: { orders: [{ id: 1 }, { id: 2 }] } })
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'return orders.map(o => o.id)' }
    await expect(executeJsTransform(step, ctx)).resolves.toEqual([1, 2])
  })

  it('exposes input and global as objects', async () => {
    const ctx = ctxWith({ input: { name: '张三' }, global: { prefix: 'Hi' } })
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'return global.prefix + " " + input.name' }
    await expect(executeJsTransform(step, ctx)).resolves.toBe('Hi 张三')
  })

  it('awaits an async IIFE', async () => {
    const ctx = ctxWith({ local: { n: 5 } })
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'return (async () => n * 2)()' }
    await expect(executeJsTransform(step, ctx)).resolves.toBe(10)
  })

  it('throws a JsTransformError wrapping the original message', async () => {
    const ctx = ctxWith({})
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'throw new Error("boom")' }
    await expect(executeJsTransform(step, ctx)).rejects.toThrow(/js-transform 步骤 s1 执行失败/)
  })

  it('rejects a local name that shadows input/global', async () => {
    const ctx = ctxWith({ input: { x: 1 }, local: { input: 2 } as unknown as Record<string, unknown> })
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'return 1' }
    await expect(executeJsTransform(step, ctx)).rejects.toThrow(/非法变量名/)
  })
})