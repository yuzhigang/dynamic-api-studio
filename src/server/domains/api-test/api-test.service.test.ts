import { describe, expect, it, vi } from 'vitest'
import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function api(): ApiDefinitionDraft {
  return {
    projectId: 'project_order', status: 'draft', name: 'a', path: '/a', method: 'POST',
    tags: [], permissions: [], requireAuth: false, bodyContentType: 'json', requestParams: [],
    responseSchema: [],
    localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return { ok: true }' }],
  } as ApiDefinitionDraft
}

describe('ApiTestService', () => {
  it('runs the workflow and packages an ApiTestResult', async () => {
    const getDataSource = vi.fn()
    const globalVariableService = { list: () => [] } as never
    const projectVariableService = { list: () => [] } as never
    const service = new ApiTestService(getDataSource, { globalVariableService, projectVariableService })

    const result = await service.run({ apiDefinition: api(), params: {} })

    expect(result.statusCode).toBe(200)
    expect(result.response).toEqual({ ok: true })
    expect(result.logs).toHaveLength(1)
    expect(result.logs[0]).toMatchObject({ status: 'success' })
  })

  it('returns a 400-shaped result on INVALID_INPUT', async () => {
    const apiWithRequired: ApiDefinitionDraft = {
      ...api(),
      requestParams: [{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }],
    }
    const service = new ApiTestService(vi.fn(), {
      globalVariableService: { list: () => [] } as never,
      projectVariableService: { list: () => [] } as never,
    })

    const result = await service.run({ apiDefinition: apiWithRequired, params: {} })
    expect(result.statusCode).toBe(400)
    expect(result.response).toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('handles an assemble script with no return without crashing on size', async () => {
    const apiNoReturn: ApiDefinitionDraft = {
      ...api(),
      workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: '/* no return */' }],
    }
    const service = new ApiTestService(vi.fn(), {
      globalVariableService: { list: () => [] } as never,
      projectVariableService: { list: () => [] } as never,
    })

    const result = await service.run({ apiDefinition: apiNoReturn, params: {} })

    expect(result.statusCode).toBe(200)
    expect(result.response).toBeUndefined()
    expect(result.size).toBe('0')
  })
})