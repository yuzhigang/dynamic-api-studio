import type { Knex } from 'knex'

import { evalExpressionFromContext } from '@/server/expression/expression-evaluator'
import type { EnhancedSqlAnalyzer } from '@/server/analyzer'
import type { VariableContext } from '@/server/analyzer/types'
import type { KnexRegistry } from '@/server/infra/knex/knex-registry'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { ApiDefinitionDraft, WorkflowStep } from '@/shared/schemas/api-definition.schema'
import { buildApiVariableContext, getTypeDefaultValue } from '@/server/workflow/variable-context-builder'
import { validateInput } from '@/server/workflow/input-validator'
import { buildWorkflowSymbols } from '@/server/workflow/workflow-symbols'
import { PlanCache } from '@/server/workflow/plan-cache'
import { commit as commitTrx, openTransaction, rollback as rollbackTrx } from '@/server/workflow/transaction-manager'
import { executeSql } from '@/server/workflow/sql-executor'
import { executeJsTransform } from '@/server/workflow/js-transform-executor'
import { assembleResponse, type ResponseDiagnostic } from '@/server/workflow/result-assembler'
import { toKnexConfig } from '@/server/workflow/datasource-config'

export type WorkflowDeps = {
  knexRegistry: KnexRegistry
  getDataSource: (id: string) => DataSource | undefined
  analyzer: EnhancedSqlAnalyzer
}

export type WorkflowErrorCode = 'INVALID_INPUT' | 'WRITE_ACROSS_DATASOURCES' | 'ASSEMBLE_MISSING' | 'STEP_FAILED'

export type StepResult = {
  stepId: string
  kind: WorkflowStep['kind']
  status: 'success' | 'skipped' | 'failed'
  durationMs: number
  error?: string
}

export type WorkflowRunResult = {
  status: 'success' | 'failed'
  context: VariableContext
  stepResults: StepResult[]
  response: unknown
  diagnostics?: ResponseDiagnostic[]
  logs: Array<{ time: string; step: string; status: 'success' | 'failed'; durationMs: number }>
  error?: { code: WorkflowErrorCode; message: string; stepId?: string; details?: unknown }
}

export type StatementClassification = 'read' | 'write'

export type WorkflowOptions = {
  /** Test seam: override per-step execution. Default dispatches by `step.kind`. */
  executeStep?: (step: WorkflowStep, context: VariableContext, deps: WorkflowDeps) => Promise<unknown>
  /** Test seam: override read/write classification. Default compiles the plan and reads statement type. */
  classifyStep?: (step: WorkflowStep) => StatementClassification
  /** Test seam: override transaction open (default uses knex.transaction). */
  openTransaction?: (knex: import('knex').Knex) => Promise<import('knex').Knex.Transaction>
  onLog?: (log: { time: string; step: string; status: 'success' | 'failed'; durationMs: number }) => void
}

/**
 * Execute an API workflow. Returns a structured result; never throws for expected failures.
 */
export async function runWorkflow(
  apiDefinition: ApiDefinitionDraft,
  inputValues: Record<string, unknown>,
  globalValues: Record<string, unknown>,
  deps?: WorkflowDeps,
  options: WorkflowOptions = {},
): Promise<WorkflowRunResult> {
  const inputValidation = validateInput(apiDefinition, inputValues)
  if (!inputValidation.ok) {
    return {
      status: 'failed', context: buildApiVariableContext({ input: inputValues, global: globalValues, localVariables: [] }),
      stepResults: [], response: undefined, logs: [],
      error: { code: 'INVALID_INPUT', message: '输入参数校验失败', details: inputValidation.errors },
    }
  }

  const assembleSteps = apiDefinition.workflowSteps.filter((s) => s.role === 'assemble')
  if (assembleSteps.length !== 1 || assembleSteps[0] !== apiDefinition.workflowSteps[apiDefinition.workflowSteps.length - 1]) {
    return {
      status: 'failed', context: buildApiVariableContext({ input: inputValues, global: globalValues, localVariables: apiDefinition.localVariables }),
      stepResults: [], response: undefined, logs: [],
      error: { code: 'ASSEMBLE_MISSING', message: '工作流必须包含且仅包含一个 role="assemble" 步骤且为最后一步' },
    }
  }

  const context = buildApiVariableContext({ input: inputValues, global: globalValues, localVariables: apiDefinition.localVariables })
  const symbols = buildWorkflowSymbols(apiDefinition, Object.keys(globalValues))
  const planCache = new PlanCache(deps?.analyzer ?? ({} as EnhancedSqlAnalyzer))

  const sqlSteps = apiDefinition.workflowSteps.filter((s) => s.kind === 'sql-query')
  const classify = options.classifyStep ?? ((step) => classifySqlStep(step, deps, symbols, planCache))
  const writeSteps = sqlSteps.filter((s) => classify(s) === 'write')
  const writeStepIds = new Set(writeSteps.map((step) => step.id))

  let trx: Knex.Transaction | undefined
  if (writeSteps.length > 0) {
    const datasourceIds = new Set(writeSteps.map((s) => s.datasourceId))
    if (datasourceIds.size > 1) {
      return {
        status: 'failed', context, stepResults: [], response: undefined, logs: [],
        error: { code: 'WRITE_ACROSS_DATASOURCES', message: '写步骤必须共用同一数据源', details: Array.from(datasourceIds) },
      }
    }
    if (deps) {
      const dataSource = deps.getDataSource(writeSteps[0].datasourceId ?? '')
      if (dataSource) {
        const knex = deps.knexRegistry.getOrCreate(toKnexConfig(dataSource))
        trx = await (options.openTransaction ?? openTransaction)(knex)
      }
    }
  }

  const execute = options.executeStep ?? ((step, ctx, d) => dispatchStep(step, ctx, d, { symbols, planCache, trx, writeStepIds }))

  const stepResults: StepResult[] = []
  const logs: WorkflowRunResult['logs'] = []

  for (const [index, step] of apiDefinition.workflowSteps.entries()) {
    const shouldRun = step.condition ? Boolean(evalExpressionFromContext(step.condition, context)) : true
    if (!shouldRun) {
      const outputType = inferOutputVariableType(apiDefinition.localVariables, step.outputVariable)
      context.set('local', step.outputVariable, { value: getTypeDefaultValue(outputType), type: outputType })
      stepResults.push({ stepId: step.id, kind: step.kind, status: 'skipped', durationMs: 0 })
      continue
    }

    const start = performance.now()
    try {
      const result = await execute(step, context, deps as WorkflowDeps)
      const durationMs = Math.round(performance.now() - start)
      context.set('local', step.outputVariable, { value: result, type: inferResultType(result) })
      stepResults.push({ stepId: step.id, kind: step.kind, status: 'success', durationMs })
      pushLog(logs, options, index, step, 'success', durationMs)
    } catch (error) {
      const durationMs = Math.round(performance.now() - start)
      const message = error instanceof Error ? error.message : String(error)
      stepResults.push({ stepId: step.id, kind: step.kind, status: 'failed', durationMs, error: message })
      pushLog(logs, options, index, step, 'failed', durationMs)
      if (trx) await safeRollback(trx)
      const assembled = assembleResponse(apiDefinition, context)
      return {
        status: 'failed', context, stepResults, response: assembled.response, logs,
        error: { code: 'STEP_FAILED', message, stepId: step.id, details: errorDetails(step, error) },
      }
    }
  }

  if (trx) {
    try {
      await commitTrx(trx)
    } catch (error) {
      await safeRollback(trx)
      const message = error instanceof Error ? error.message : String(error)
      return {
        status: 'failed', context, stepResults, response: undefined, logs,
        error: { code: 'STEP_FAILED', message: `事务提交失败：${message}` },
      }
    }
  }

  const { response, diagnostics } = assembleResponse(apiDefinition, context)
  return { status: 'success', context, stepResults, response, logs, diagnostics }
}

async function dispatchStep(
  step: WorkflowStep,
  context: VariableContext,
  deps: WorkflowDeps,
  execOptions: { symbols: ReturnType<typeof buildWorkflowSymbols>; planCache: PlanCache; trx?: Knex.Transaction; writeStepIds: Set<string> },
): Promise<unknown> {
  if (step.kind === 'sql-query') {
    return executeSql(step, context, deps, {
      symbols: execOptions.symbols,
      planCache: execOptions.planCache,
      trx: execOptions.writeStepIds.has(step.id) ? execOptions.trx : undefined,
    })
  }
  return executeJsTransform(step, context)
}

function classifySqlStep(
  step: WorkflowStep,
  deps: WorkflowDeps | undefined,
  symbols: ReturnType<typeof buildWorkflowSymbols>,
  planCache: PlanCache,
): StatementClassification {
  if (!deps || !step.datasourceId) return 'read'
  const dataSource = deps.getDataSource(step.datasourceId)
  if (!dataSource) return 'read'
  const plan = planCache.getOrCompile(step, symbols, { dataSource })
  const type = deps.analyzer.getStatementType(plan)
  return type === 'insert' || type === 'update' || type === 'delete' ? 'write' : 'read'
}

function pushLog(
  logs: WorkflowRunResult['logs'],
  options: WorkflowOptions,
  index: number,
  step: WorkflowStep,
  status: 'success' | 'failed',
  durationMs: number,
): void {
  const log = { time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), step: `步骤 ${index + 1} - ${step.title}`, status, durationMs }
  logs.push(log)
  options.onLog?.(log)
}

function inferResultType(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'object' && value !== null) return 'object'
  return 'string'
}

function inferOutputVariableType(localVariables: ApiDefinitionDraft['localVariables'], outputVariable: string): string {
  const declared = localVariables.find((v) => v.name === outputVariable)
  return declared?.type ?? 'array'
}

function errorDetails(step: WorkflowStep, error: unknown): unknown {
  void error
  if (step.kind === 'sql-query') return { sql: step.sql, datasourceId: step.datasourceId }
  return { scriptSnippet: step.script?.slice(0, 200) }
}

async function safeRollback(trx: Knex.Transaction): Promise<void> {
  try { await rollbackTrx(trx) } catch { /* ignore rollback errors */ }
}