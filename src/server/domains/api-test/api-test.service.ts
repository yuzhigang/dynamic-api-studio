import type {
  ApiTestRequest,
  ApiTestResult,
  ExecutionLog,
} from '@/shared/contracts/api-definition.contract'

export class ApiTestService {
  run(request: ApiTestRequest): ApiTestResult {
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
