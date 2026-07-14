import { describe, expect, it, vi } from 'vitest'
import type { Knex } from 'knex'
import type { ApiDefinitionDraft, WorkflowStep } from '@/shared/schemas/api-definition.schema'
import { runWorkflow } from '@/server/workflow/workflow-runner'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'

function buildApi(definition: Partial<ApiDefinitionDraft> & { workflowSteps: ApiDefinitionDraft['workflowSteps'] }): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'draft', name: 'Test API', path: '/test', method: 'POST',
    tags: [], permissions: [], bodyContentType: 'json', requestParams: [], responseSchema: [],
    localVariables: [], ...definition,
  } as ApiDefinitionDraft
}

const noopDeps = { knexRegistry: {}, getDataSource: () => undefined, analyzer: {} } as never
const trxTestDeps = {
  getDataSource: () => ({ id: 'dsA', name: 'pg', dialect: 'postgresql', host: 'h', port: 5432, database: 'd', username: 'u', password: 'p', createdAt: 't', updatedAt: 't' }),
  knexRegistry: { getOrCreate: () => ({}) },
  analyzer: {},
} as never

describe('runWorkflow', () => {
  it('returns INVALID_INPUT when a required param is missing', async () => {
    const api = buildApi({
      requestParams: [{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }],
      workflowSteps: [],
    })
    const result = await runWorkflow(api, {}, {}, noopDeps)
    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('dispatches each step to executeStep and writes the output to local scope', async () => {
    const s1: WorkflowStep = { id: 's1', kind: 'sql-query', title: 'q', outputVariable: 'orders' }
    const s2: WorkflowStep = { id: 's2', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' }
    const api = buildApi({ workflowSteps: [s1, s2] })
    const stub = vi.fn().mockResolvedValue([{ id: 1 }])

    const result = await runWorkflow(api, {}, {}, noopDeps, { executeStep: stub })

    expect(result.status).toBe('success')
    expect(stub).toHaveBeenCalledWith(s1, expect.any(Object), noopDeps)
    expect(result.context.get('local', 'orders')?.value).toEqual([{ id: 1 }])
    expect(result.context.get('local', 'orders')?.type).toBe('array')
  })

  it('skips a step whose condition is false and writes the default value', async () => {
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'q', outputVariable: 'orders', condition: '$input.enabled' },
        { id: 's2', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn().mockResolvedValue('ok')
    const result = await runWorkflow(api, { enabled: false }, {}, noopDeps, { executeStep: stub })
    expect(stub).toHaveBeenCalledTimes(1)
    expect(result.context.get('local', 'orders')?.value).toEqual([])
    expect(result.stepResults[0]).toMatchObject({ stepId: 's1', status: 'skipped' })
    expect(result.stepResults[1]).toMatchObject({ stepId: 's2', status: 'success' })
  })

  it('returns the assemble step output as response', async () => {
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn().mockResolvedValue({ list: [1] })
    const result = await runWorkflow(api, {}, {}, noopDeps, { executeStep: stub })
    expect(result.response).toEqual({ list: [1] })
  })

  it('returns ASSEMBLE_MISSING when no assemble step exists', async () => {
    const api = buildApi({ workflowSteps: [{ id: 's1', kind: 'sql-query', title: 'q', outputVariable: 'rows' }] })
    const stub = vi.fn().mockResolvedValue([])
    const result = await runWorkflow(api, {}, {}, noopDeps, { executeStep: stub })
    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('ASSEMBLE_MISSING')
  })

  it('returns WRITE_ACROSS_DATASOURCES when write steps target different sources', async () => {
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'q1', outputVariable: 'a', datasourceId: 'dsA' },
        { id: 's2', kind: 'sql-query', title: 'q2', outputVariable: 'b', datasourceId: 'dsB' },
        { id: 's3', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn()
    const result = await runWorkflow(api, {}, {}, noopDeps, {
      executeStep: stub,
      classifyStep: () => 'write',
    })
    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('WRITE_ACROSS_DATASOURCES')
  })

  it('opens one transaction for write steps sharing a datasource and commits on success', async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    const rollback = vi.fn()
    const trx = { commit, rollback } as unknown as Knex.Transaction
    const openTransaction = vi.fn().mockResolvedValue(trx)
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'q1', outputVariable: 'a', datasourceId: 'dsA' },
        { id: 's2', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn().mockResolvedValue(1)
    const result = await runWorkflow(api, {}, {}, trxTestDeps, {
      executeStep: stub,
      classifyStep: (s) => (s.kind === 'sql-query' ? 'write' : 'read'),
      openTransaction,
    })
    expect(openTransaction).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(rollback).not.toHaveBeenCalled()
    expect(result.status).toBe('success')
  })

  it('rolls back and returns STEP_FAILED when a step throws', async () => {
    const rollback = vi.fn().mockResolvedValue(undefined)
    const trx = { commit: vi.fn(), rollback } as unknown as Knex.Transaction
    const openTransaction = vi.fn().mockResolvedValue(trx)
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'q1', outputVariable: 'a', datasourceId: 'dsA' },
        { id: 's2', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn().mockRejectedValue(new Error('boom'))
    const result = await runWorkflow(api, {}, {}, trxTestDeps, {
      executeStep: stub,
      classifyStep: (s) => (s.kind === 'sql-query' ? 'write' : 'read'),
      openTransaction,
    })
    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('STEP_FAILED')
    expect(result.error?.stepId).toBe('s1')
    expect(rollback).toHaveBeenCalledTimes(1)
  })

  it('runs read steps via knex.raw and write steps via trx.raw', async () => {
    const knexRaw = vi.fn().mockResolvedValue({ rows: [{ cnt: 1 }] })
    const trxRaw = vi.fn().mockResolvedValue({ rows: [{ id: 1 }] })
    const trx = { raw: trxRaw, commit: vi.fn().mockResolvedValue(undefined), rollback: vi.fn().mockResolvedValue(undefined) } as unknown as Knex.Transaction
    const openTransaction = vi.fn().mockResolvedValue(trx)
    const pg = { id: 'dsA', name: 'pg', dialect: 'postgresql', host: 'h', port: 5432, database: 'd', username: 'u', password: 'p', createdAt: 't', updatedAt: 't' }
    const deps = {
      getDataSource: () => pg,
      knexRegistry: { getOrCreate: () => ({ raw: knexRaw }) },
      analyzer: new EnhancedSqlAnalyzer(),
    } as never

    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'insert', outputVariable: 'ins', datasourceId: 'dsA', sql: 'INSERT INTO t (a) VALUES (1)' },
        { id: 's2', kind: 'sql-query', title: 'count', outputVariable: 'cnt', datasourceId: 'dsA', sql: 'SELECT 1 AS cnt' },
        { id: 's3', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return { ok: true }' },
      ],
    })

    const result = await runWorkflow(api, {}, {}, deps, { openTransaction })

    expect(result.status).toBe('success')
    expect(trxRaw).toHaveBeenCalledTimes(1)   // s1 is the write step
    expect(knexRaw).toHaveBeenCalledTimes(1)  // s2 is the read step
  })

  it('returns STEP_FAILED when the transaction commit throws', async () => {
    const trx = { commit: vi.fn().mockRejectedValue(new Error('commit failed')), rollback: vi.fn().mockResolvedValue(undefined), raw: vi.fn() } as unknown as Knex.Transaction
    const openTransaction = vi.fn().mockResolvedValue(trx)
    const pg = { id: 'dsA', name: 'pg', dialect: 'postgresql', host: 'h', port: 5432, database: 'd', username: 'u', password: 'p', createdAt: 't', updatedAt: 't' }
    const deps = { getDataSource: () => pg, knexRegistry: { getOrCreate: () => ({}) }, analyzer: {} } as never

    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'insert', outputVariable: 'ins', datasourceId: 'dsA', sql: 'INSERT INTO t (a) VALUES (1)' },
        { id: 's2', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return 1' },
      ],
    })
    const stub = vi.fn().mockResolvedValue(1)

    const result = await runWorkflow(api, {}, {}, deps, { executeStep: stub, classifyStep: () => 'write', openTransaction })

    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('STEP_FAILED')
    expect(result.error?.message).toMatch(/事务提交失败/)
    expect(trx.rollback).toHaveBeenCalledTimes(1)
  })
})