import { describe, expect, it, vi } from 'vitest'
import { runWorkflow, executeStep } from '@/server/workflow/workflow-runner'
import type { ApiDefinitionDraft, WorkflowStep } from '@/shared/schemas/api-definition.schema'

function buildApi(definition: Partial<ApiDefinitionDraft> & { workflowSteps: ApiDefinitionDraft['workflowSteps'] }): ApiDefinitionDraft {
  return {
    projectId: 'project-1',
    status: 'draft',
    name: 'Test API',
    path: '/test',
    method: 'POST',
    tags: [],
    permissions: [],
    bodyContentType: 'json',
    requestParams: [],
    responseSchema: [],
    localVariables: [],
    ...definition,
  } as ApiDefinitionDraft
}

describe('runWorkflow', () => {
  it('builds context from input and global values', async () => {
    const api = buildApi({ workflowSteps: [] })
    const { context, results } = await runWorkflow(
      api,
      { id: 42 },
      { tenantId: 't-1' },
    )

    expect(results).toHaveLength(0)
    expect(context.get('input', 'id')?.value).toBe(42)
    expect(context.get('global', 'tenantId')?.value).toBe('t-1')
  })

  it('executes steps and writes output variables', async () => {
    const step: WorkflowStep = {
      id: 's1',
      kind: 'sql-query',
      title: 'Query orders',
      outputVariable: 'orders',
    }
    const api = buildApi({ workflowSteps: [step] })
    const stub = vi.fn().mockResolvedValue([{ id: 1 }])

    const { context, results } = await runWorkflow(api, {}, {}, { executeStep: stub })

    expect(stub).toHaveBeenCalledWith(step, expect.any(Object))
    expect(results).toEqual([{ stepId: 's1', result: [{ id: 1 }] }])
    expect(context.get('local', 'orders')?.value).toEqual([{ id: 1 }])
    expect(context.get('local', 'orders')?.type).toBe('array')
  })

  it('skips step when condition evaluates to false and sets default array output', async () => {
    const api = buildApi({
      workflowSteps: [
        {
          id: 's1',
          kind: 'sql-query',
          title: 'Conditional query',
          outputVariable: 'orders',
          condition: '$input.enabled',
        },
      ],
    })
    const stub = vi.fn().mockResolvedValue([{ id: 1 }])

    const { context, results } = await runWorkflow(api, { enabled: false }, {}, { executeStep: stub })

    expect(stub).not.toHaveBeenCalled()
    expect(results).toEqual([{ stepId: 's1', skipped: true }])
    expect(context.get('local', 'orders')?.value).toEqual([])
    expect(context.get('local', 'orders')?.type).toBe('array')
  })

  it('executes step when condition evaluates to true', async () => {
    const api = buildApi({
      workflowSteps: [
        {
          id: 's1',
          kind: 'sql-query',
          title: 'Conditional query',
          outputVariable: 'orders',
          condition: '$input.enabled',
        },
      ],
    })
    const stub = vi.fn().mockResolvedValue([{ id: 2 }])

    const { context, results } = await runWorkflow(api, { enabled: true }, {}, { executeStep: stub })

    expect(stub).toHaveBeenCalledTimes(1)
    expect(results).toEqual([{ stepId: 's1', result: [{ id: 2 }] }])
    expect(context.get('local', 'orders')?.value).toEqual([{ id: 2 }])
  })

  it('supports local variables referenced in conditions', async () => {
    const api = buildApi({
      localVariables: [
        {
          id: 'v1',
          name: 'shouldRun',
          type: 'boolean',
          mode: 'required',
          value: { kind: 'expression', expression: '$input.enabled' },
        },
      ],
      workflowSteps: [
        {
          id: 's1',
          kind: 'js-transform',
          title: 'Conditional transform',
          outputVariable: 'result',
          condition: '$shouldRun',
        },
      ],
    })
    const stub = vi.fn().mockResolvedValue('ok')

    const { results } = await runWorkflow(api, { enabled: true }, {}, { executeStep: stub })

    expect(results).toEqual([{ stepId: 's1', result: 'ok' }])
  })
})

describe('executeStep', () => {
  it('throws not implemented error by default', async () => {
    const step: WorkflowStep = {
      id: 's1',
      kind: 'sql-query',
      title: 'Query',
      outputVariable: 'orders',
    }

    await expect(executeStep(step, {} as any)).rejects.toThrow('executeStep is not implemented')
  })
})
