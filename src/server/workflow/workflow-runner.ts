import { buildApiVariableContext, getTypeDefaultValue } from '@/server/workflow/variable-context-builder'
import { evalExpressionFromContext } from '@/server/expression/expression-evaluator'
import type { VariableContext } from '@/server/analyzer/types'
import type { ApiDefinitionDraft, WorkflowStep } from '@/shared/schemas/api-definition.schema'

export type StepResult = {
  stepId: string
  skipped?: boolean
  result?: unknown
}

export type WorkflowRunnerOptions = {
  executeStep?: (step: WorkflowStep, context: VariableContext) => Promise<unknown>
}

/**
 * 按顺序执行 API 工作流步骤。
 *
 * 1. 根据 input / global / localVariables 构建 VariableContext
 * 2. 遍历 workflowSteps，按条件决定是否执行
 * 3. 执行结果写入 outputVariable 对应的 local 作用域
 *
 * 当前为骨架实现：executeStep 默认抛出未实现错误。
 */
export async function runWorkflow(
  apiDefinition: ApiDefinitionDraft,
  inputParams: Record<string, unknown>,
  globalValues: Record<string, unknown>,
  options: WorkflowRunnerOptions = {},
): Promise<{ context: VariableContext; results: StepResult[] }> {
  const execute = options.executeStep ?? executeStep

  const context = buildApiVariableContext({
    input: inputParams,
    global: globalValues,
    localVariables: apiDefinition.localVariables,
  })
  const results: StepResult[] = []

  for (const step of apiDefinition.workflowSteps) {
    const shouldRun = step.condition
      ? Boolean(evalExpressionFromContext(step.condition, context))
      : true

    if (!shouldRun) {
      context.set('local', step.outputVariable, {
        value: getTypeDefaultValue('array'),
        type: 'array',
      })
      results.push({ stepId: step.id, skipped: true })
      continue
    }

    const result = await execute(step, context)
    context.set('local', step.outputVariable, {
      value: result,
      type: inferResultType(result),
    })
    results.push({ stepId: step.id, result })
  }

  return { context, results }
}

export async function executeStep(_step: WorkflowStep, _context: VariableContext): Promise<unknown> {
  throw new Error('executeStep is not implemented: SQL/JS step execution is handled by domain-specific executors')
}

function inferResultType(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'object' && value !== null) return 'object'
  return 'string'
}
