import type { Knex } from 'knex'

import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { renderFromPlan } from '@/server/analyzer/render-from-plan'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import { KnexRegistry, type DataSourceConfig } from '@/server/infra/knex/knex-registry'
import type {
  ApiTestRequest,
  ApiTestResult,
  ExecutionLog,
} from '@/shared/contracts/api-definition.contract'

const dialectToKnexClient: Record<DataSource['dialect'], string> = {
  postgresql: 'pg',
  mysql: 'mysql2',
  oracle: 'oracledb',
  sqlserver: 'mssql',
  tdengine: 'tdengine',
}

export class ApiTestService {
  private readonly analyzer = new EnhancedSqlAnalyzer()
  private readonly knexRegistry = new KnexRegistry()

  constructor(private readonly getDataSource: (id: string) => DataSource | undefined) {}

  async run(request: ApiTestRequest): Promise<ApiTestResult> {
    // 简化版：只执行第一个 sql-query 步骤
    const sqlStep = request.apiDefinition.workflowSteps.find((step) => step.kind === 'sql-query')

    if (!sqlStep || !sqlStep.sql || !sqlStep.datasourceId) {
      return this.mockResult(request)
    }

    const dataSource = this.getDataSource(sqlStep.datasourceId)

    if (!dataSource) {
      throw new Error(`数据源 ${sqlStep.datasourceId} 不存在`)
    }

    const plan = this.analyzer.analyze({
      sql: sqlStep.sql,
      dialect: mapDialect(dataSource.dialect),
      inputNames: request.apiDefinition.requestParams.map((p) => p.name),
    })

    const rendered = renderFromPlan(plan, {
      input: request.params,
      global: {},
      local: {},
    })

    const knex = this.knexRegistry.getOrCreate(toKnexConfig(dataSource))
    const start = performance.now()
    const rows = await knex.raw(rendered.sql, rendered.params.map((p) => p.value) as Knex.RawBinding[])
    const durationMs = Math.round(performance.now() - start)

    return {
      statusCode: 200,
      durationMs,
      size: JSON.stringify(rows).length.toString(),
      requestPreview: { sql: rendered.sql, params: rendered.params },
      response: { rows },
      logs: [{ time: new Date().toLocaleTimeString('zh-CN'), step: sqlStep.title, status: 'success', durationMs }],
    }
  }

  private mockResult(request: ApiTestRequest): ApiTestResult {
    const logs: ExecutionLog[] = request.apiDefinition.workflowSteps.map((step, index) => ({
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      step: `步骤 ${index + 1} - ${step.title}`,
      status: 'success',
      durationMs: 19 + index * 7,
    }))

    return {
      statusCode: 200,
      durationMs: logs.reduce((total, log) => total + log.durationMs, 0),
      size: '1.50KB',
      requestPreview: request.params,
      response: {
        code: 0,
        msg: 'success',
        data: {
          list: [
            {
              order_id: '202406070001',
              order_no: 'ORD-00001',
              customer_name: request.params.customerName || '张三',
              total_amount: 306.5,
              status: 'PAID',
              create_time: '2024-06-07 10:13:57',
              items: [
                {
                  product_id: 1001,
                  product_name: '无线鼠标 Pro',
                  quantity: 2,
                  price: 99.9,
                },
              ],
            },
          ],
        },
      },
      logs,
    }
  }
}

function mapDialect(dialect: DataSource['dialect']): 'postgresql' | 'mysql' | 'oracle' | 'sqlserver' {
  if (dialect === 'tdengine') {
    // tdengine 语法接近 postgresql，解析器暂按 postgresql 处理
    return 'postgresql'
  }

  return dialect
}

function toKnexConfig(dataSource: DataSource): DataSourceConfig {
  const client = dialectToKnexClient[dataSource.dialect]

  if (!client) {
    throw new Error(`不支持的数据源方言：${dataSource.dialect}`)
  }

  return {
    id: dataSource.id,
    client,
    connection: {
      host: dataSource.host,
      port: dataSource.port,
      user: dataSource.username,
      password: dataSource.password,
      database: dataSource.database,
    },
  }
}
