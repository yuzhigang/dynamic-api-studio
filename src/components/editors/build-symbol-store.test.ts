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
  bodyContentType: 'json' as const,
  requestParams: [
    { id: 'p1', name: 'status', location: 'query' as const, type: 'string' as const, required: true },
  ],
  responseSchema: [],
  workflowSteps: [],
}

describe('buildSymbolStore', () => {
  it('builds input symbols', () => {
    const symbols = buildSymbolStore(baseApi)
    expect(symbols.some((s) => s.label === '$input.status')).toBe(true)
  })

  it('builds global symbols', () => {
    const symbols = buildSymbolStore(baseApi, undefined, [{ name: 'region', label: '区域', detail: '全局变量' }])
    expect(symbols.some((s) => s.label === '$.region')).toBe(true)
  })
})
