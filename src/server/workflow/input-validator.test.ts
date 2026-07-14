import { describe, expect, it } from 'vitest'
import { validateInput } from '@/server/workflow/input-validator'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function buildApi(requestParams: ApiDefinitionDraft['requestParams']): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'draft', name: 'a', path: '/a', method: 'POST',
    tags: [], permissions: [], bodyContentType: 'json',
    requestParams, responseSchema: [], localVariables: [], workflowSteps: [],
  } as ApiDefinitionDraft
}

describe('validateInput', () => {
  it('passes when required params are present and typed', () => {
    const api = buildApi([
      { id: 'r1', name: 'id', location: 'query', type: 'integer', required: true },
      { id: 'r2', name: 'name', location: 'query', type: 'string', required: false },
    ])
    const result = validateInput(api, { id: 7 })
    expect(result).toEqual({ ok: true })
  })

  it('fails when a required param is missing', () => {
    const api = buildApi([{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }])
    expect(validateInput(api, {})).toEqual({ ok: false, errors: [{ name: 'id', message: '缺少必填参数 id' }] })
  })

  it('fails when a param has the wrong scalar type', () => {
    const api = buildApi([{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }])
    expect(validateInput(api, { id: 'not-a-number' })).toEqual({
      ok: false,
      errors: [{ name: 'id', message: '参数 id 应为 integer' }],
    })
  })
})