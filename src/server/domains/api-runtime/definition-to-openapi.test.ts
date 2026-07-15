import { describe, expect, it } from 'vitest'
import { buildRoute } from '@/server/domains/api-runtime/definition-to-openapi'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function def(overrides: Partial<ApiDefinitionDraft> = {}): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'published', name: '订单查询', path: '/api/v1/order/query',
    method: 'POST', tags: ['订单'], permissions: [], bodyContentType: 'json',
    requestParams: [
      { id: 'r1', name: 'id', location: 'query', type: 'integer', required: true },
      { id: 'r2', name: 'name', location: 'query', type: 'string', required: false },
    ],
    responseSchema: [{ id: 'f1', name: 'total', type: 'integer', required: true }],
    localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return { total: 1 }' }],
    ...overrides,
  } as ApiDefinitionDraft
}

describe('buildRoute', () => {
  it('builds a route with method/path/metadata', () => {
    const route = buildRoute(def())
    expect(route.method).toBe('post')
    expect(route.path).toBe('/api/v1/order/query')
  })

  it('coerces query integer (string -> number) and validates', () => {
    const route = buildRoute(def())
    const querySchema = (route.request as { query?: { safeParse: (v: unknown) => { success: boolean; data?: unknown } } }).query
    expect(querySchema).toBeDefined()
    expect(querySchema!.safeParse({ id: '7' })).toMatchObject({ success: true, data: { id: 7 } })
    expect(querySchema!.safeParse({ id: 'abc' }).success).toBe(false)
  })

  it('requires the required param and makes optional ones optional', () => {
    const route = buildRoute(def())
    const querySchema = (route.request as { query?: { safeParse: (v: unknown) => { success: boolean } } }).query
    expect(querySchema!.safeParse({}).success).toBe(false) // id required
  })

  it('omits body schema when there are no body params', () => {
    const route = buildRoute(def())
    expect((route.request as { body?: unknown }).body).toBeUndefined()
  })

  it('builds a body schema for json body params (uncoerced)', () => {
    const route = buildRoute(def({ bodyContentType: 'json', requestParams: [{ id: 'r1', name: 'payload', location: 'body', type: 'integer', required: true }] }))
    const bodySchema = (route.request as { body?: { content: { 'application/json': { schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } } } } } }).body!.content['application/json'].schema
    expect(bodySchema.safeParse({ payload: 7 })).toMatchObject({ success: true, data: { payload: 7 } })
    expect(bodySchema.safeParse({ payload: '7' }).success).toBe(false) // body not coerced
  })

  it('registers 200/400/500 responses', () => {
    const route = buildRoute(def())
    expect(Object.keys(route.responses).sort()).toEqual(['200', '400', '500'])
  })
})