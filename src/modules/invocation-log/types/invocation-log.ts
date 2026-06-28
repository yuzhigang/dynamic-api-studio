import type { HttpMethod } from '@/shared/enums/http-method'

export type InvocationLogStatus = 'success' | 'failed' | 'timeout'

export type InvocationLog = {
  id: string
  invokedAt: string
  method: HttpMethod
  apiName?: string
  path: string
  statusCode: number
  status: InvocationLogStatus
  durationMs: number
}

/** 调用日志查询条件。所有字段可选，未填写表示不限。 */
export type InvocationLogFilters = {
  /** 按 API 名称或请求路径模糊匹配。 */
  apiName?: string
  method?: HttpMethod
  status?: InvocationLogStatus
  /** 状态码精确匹配（字符串以便表单输入，服务端转换）。 */
  statusCode?: string
  /** 起始日期 YYYY-MM-DD（含当天）。 */
  startDate?: string
  /** 结束日期 YYYY-MM-DD（含当天）。 */
  endDate?: string
}
