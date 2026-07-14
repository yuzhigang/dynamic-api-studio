import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'
import { assembleResponse } from '@/server/workflow/result-assembler'
import type { ApiDefinitionDraft, WorkflowStep } from '@/shared/schemas/api-definition.schema'

function api(steps: WorkflowStep[], responseSchema: ApiDefinitionDraft['responseSchema'] = []): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'draft', name: 'a', path: '/a', method: 'POST',
    tags: [], permissions: [], bodyContentType: 'json', requestParams: [],
    responseSchema, localVariables: [], workflowSteps: steps,
  } as ApiDefinitionDraft
}

describe('assembleResponse', () => {
  it('returns the assemble step outputVariable value', () => {
    const ctx = createVariableContext()
    ctx.set('local', 'data', { value: { list: [1, 2] }, type: 'object' })
    const steps = [{ id: 's1', kind: 'js-transform' as const, title: 'assemble', outputVariable: 'data', role: 'assemble' }]
    const { response, diagnostics } = assembleResponse(api(steps), ctx)
    expect(response).toEqual({ list: [1, 2] })
    expect(diagnostics).toEqual([])
  })

  it('records a diagnostic when a required top-level field is missing', () => {
    const ctx = createVariableContext()
    ctx.set('local', 'data', { value: { list: [1] }, type: 'object' })
    const steps = [{ id: 's1', kind: 'js-transform' as const, title: 'assemble', outputVariable: 'data', role: 'assemble' }]
    const schema = [{ id: 'f1', name: 'total', type: 'integer' as const, required: true }]
    const { diagnostics } = assembleResponse(api(steps, schema), ctx)
    expect(diagnostics).toContainEqual({ field: 'total', message: '缺少必填字段 total' })
  })

  it('throws when there is no assemble step', () => {
    const ctx = createVariableContext()
    const steps = [{ id: 's1', kind: 'sql-query' as const, title: 'q', outputVariable: 'rows' }]
    expect(() => assembleResponse(api(steps), ctx)).toThrow(/assemble/)
  })
})