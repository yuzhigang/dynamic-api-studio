import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { runWorkflow } from '@/server/workflow/workflow-runner'
import { loadGlobalValues } from '@/server/workflow/global-variable-loader'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import type { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'
import type { ApiTestRequest, ApiTestResult, ExecutionLog } from '@/shared/contracts/api-definition.contract'

export type ApiTestServiceDeps = {
  globalVariableService: GlobalVariableService
  projectVariableService: ProjectVariableService
}

export class ApiTestService {
  private readonly analyzer = new EnhancedSqlAnalyzer()
  private readonly knexRegistry = new KnexRegistry()

  constructor(
    private readonly getDataSource: (id: string) => DataSource | undefined,
    private readonly services: ApiTestServiceDeps,
  ) {}

  async run(request: ApiTestRequest): Promise<ApiTestResult> {
    const { apiDefinition, params } = request
    const globalValues = loadGlobalValues(apiDefinition.projectId, this.services)

    const start = performance.now()
    const run = await runWorkflow(apiDefinition, params, globalValues, {
      knexRegistry: this.knexRegistry,
      getDataSource: this.getDataSource,
      analyzer: this.analyzer,
    })
    const durationMs = Math.round(performance.now() - start)

    if (run.status === 'failed') {
      const statusCode = run.error?.code === 'INVALID_INPUT' ? 400 : 500
      return {
        statusCode,
        durationMs,
        size: '0',
        requestPreview: params,
        response: { code: run.error?.code, message: run.error?.message, details: run.error?.details },
        logs: run.logs as ExecutionLog[],
      }
    }

    return {
      statusCode: 200,
      durationMs,
      size: JSON.stringify(run.response).length.toString(),
      requestPreview: params,
      response: run.response,
      logs: run.logs as ExecutionLog[],
    }
  }
}