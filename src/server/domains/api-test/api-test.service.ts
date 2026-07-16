import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { runWorkflow } from '@/server/workflow/workflow-runner'
import { loadGlobalValues } from '@/server/workflow/global-variable-loader'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import type { InvocationLogRepository } from '@/server/domains/invocation-log/invocation-log.repository'
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
    private readonly getDataSource: (id: string) => Promise<DataSource | undefined>,
    private readonly services: ApiTestServiceDeps,
    /** 可选：传入则把每次测试执行落一条 kind='test' 日志；不传（如离线单测）则不写。 */
    private readonly invocationLogRepository?: InvocationLogRepository,
  ) {}

  async run(request: ApiTestRequest): Promise<ApiTestResult> {
    const { apiDefinition, params } = request
    const globalValues = await loadGlobalValues(apiDefinition.projectId, this.services)

    const start = performance.now()
    const run = await runWorkflow(apiDefinition, params, globalValues, {
      knexRegistry: this.knexRegistry,
      getDataSource: this.getDataSource,
      analyzer: this.analyzer,
    })
    const durationMs = Math.round(performance.now() - start)

    const result: ApiTestResult =
      run.status === 'failed'
        ? {
            statusCode: run.error?.code === 'INVALID_INPUT' ? 400 : 500,
            durationMs,
            size: '0',
            requestPreview: params,
            response: { code: run.error?.code, message: run.error?.message, details: run.error?.details },
            logs: run.logs as ExecutionLog[],
          }
        : {
            statusCode: 200,
            durationMs,
            size: run.response === undefined ? '0' : JSON.stringify(run.response).length.toString(),
            requestPreview: params,
            response: run.response,
            logs: run.logs as ExecutionLog[],
          }

    if (this.invocationLogRepository) {
      // 日志写入为副作用，失败不应阻断测试结果返回。
      try {
        await this.invocationLogRepository.write({
          kind: 'test',
          apiId: apiDefinition.id,
          projectId: apiDefinition.projectId,
          invokedAt: new Date(),
          method: apiDefinition.method,
          path: apiDefinition.path,
          apiName: apiDefinition.name,
          statusCode: result.statusCode,
          status: result.statusCode < 400 ? 'success' : 'failed',
          durationMs: result.durationMs,
          requestParams: params,
          responseBody: result.response,
          errorDetail: run.status === 'failed' ? run.error?.message : undefined,
          steps: run.logs as unknown[],
        })
      } catch (error) {
        console.error('[api-test] 调用日志写入失败：', error)
      }
    }

    return result
  }
}