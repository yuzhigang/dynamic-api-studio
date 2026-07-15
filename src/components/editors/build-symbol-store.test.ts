import { describe, expect, it } from 'vitest'
import { buildSymbolStore } from '@/components/editors/build-symbol-store'

const baseApi = {
  id: 'api',
  projectId: 'p1',
  status: 'draft' as const,
  name: 'api',
  path: '/api',
  method: 'GET' as const,
  tags: [],
  permissions: [],
  requireAuth: false,
  bodyContentType: 'json' as const,
  description: '',
  requestParams: [
    { id: 'p1', name: 'status', location: 'query' as const, type: 'string' as const, required: true },
  ],
  responseSchema: [],
  localVariables: [],
  workflowSteps: [],
}

describe('buildSymbolStore', () => {
  it('builds input symbols', () => {
    const symbols = buildSymbolStore(baseApi)
    expect(symbols.some((s) => s.label === '$input.status' && s.source === 'input')).toBe(true)
  })

  it('builds global symbols', () => {
    const symbols = buildSymbolStore(baseApi, undefined, [{ name: 'region', label: '区域', detail: '全局变量' }])
    expect(symbols.some((s) => s.label === '$.region' && s.source === 'global')).toBe(true)
  })

  it('builds local design-time symbols', () => {
    const symbols = buildSymbolStore({
      ...baseApi,
      localVariables: [
        {
          id: 'v1',
          name: 'offset',
          type: 'integer' as const,
          mode: 'required' as const,
          value: { kind: 'expression' as const, expression: '($input.pageSize - 1) * $input.pageNo' },
        },
      ],
    })
    expect(symbols.some((s) => s.label === '$offset' && s.source === 'design' && s.type === 'integer')).toBe(true)
  })

  it('marks array-typed local variables as array', () => {
    const symbols = buildSymbolStore({
      ...baseApi,
      localVariables: [
        {
          id: 'v1',
          name: 'orders',
          type: 'array' as const,
          mode: 'required' as const,
          value: { kind: 'literal' as const, literal: [] },
        },
      ],
    })
    const orderSymbol = symbols.find((s) => s.label === '$orders')
    expect(orderSymbol).toBeDefined()
    expect(orderSymbol?.type).toBe('array')
  })

  it('builds upstream sql-query step output symbols as array', () => {
    const symbols = buildSymbolStore(
      {
        ...baseApi,
        workflowSteps: [
          {
            id: 's1',
            kind: 'sql-query' as const,
            title: '查询订单',
            outputVariable: 'orders',
            sql: 'SELECT * FROM orders',
          },
          {
            id: 's2',
            kind: 'sql-query' as const,
            title: '使用订单',
            outputVariable: 'details',
            sql: 'SELECT * FROM details',
          },
        ],
      },
      's2',
    )
    expect(symbols.some((s) => s.label === '$orders' && s.source === 'step' && s.type === 'array')).toBe(true)
    expect(symbols.some((s) => s.label === '$details')).toBe(false)
  })
})
