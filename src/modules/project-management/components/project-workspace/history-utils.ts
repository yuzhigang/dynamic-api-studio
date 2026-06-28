import type { InvocationLog, InvocationLogStatus } from '@/modules/invocation-log'

export type TestHistoryStatus = 'success' | 'failed'

export type TestHistoryItem = {
  id: string
  name: string
  executedAt: string
  durationMs: number
  executor: string
  status: TestHistoryStatus
}

export const testHistoryItems: TestHistoryItem[] = [
  {
    id: '12',
    name: '订单查询-分页结果',
    executedAt: '2024-06-07 14:35:42',
    durationMs: 482,
    executor: 'admin',
    status: 'success',
  },
  {
    id: '11',
    name: '按客户-名查询',
    executedAt: '2024-06-07 14:10:21',
    durationMs: 316,
    executor: 'admin',
    status: 'success',
  },
  {
    id: '10',
    name: '按状态过滤',
    executedAt: '2024-06-07 13:58:20',
    durationMs: 278,
    executor: 'admin',
    status: 'success',
  },
  {
    id: '9',
    name: '按日期范围查询',
    executedAt: '2024-06-07 13:39:05',
    durationMs: 295,
    executor: 'admin',
    status: 'success',
  },
  {
    id: '8',
    name: '仅查询最近订单',
    executedAt: '2024-06-07 12:45:19',
    durationMs: 241,
    executor: 'admin',
    status: 'success',
  },
  {
    id: '7',
    name: '分页大小=100',
    executedAt: '2024-06-07 11:22:33',
    durationMs: 631,
    executor: 'admin',
    status: 'success',
  },
  {
    id: '6',
    name: '无结果场景',
    executedAt: '2024-06-07 10:16:07',
    durationMs: 198,
    executor: 'admin',
    status: 'failed',
  },
  {
    id: '5',
    name: '非法参数校验',
    executedAt: '2024-06-07 09:56:11',
    durationMs: 156,
    executor: 'admin',
    status: 'success',
  },
]

/** 基于现有测试编号取下一个序号，返回如「测试 13」的默认测试名。 */
export function getNextTestName(items: readonly TestHistoryItem[] = testHistoryItems): string {
  const maxSequence = items.reduce((max, item) => {
    const sequence = Number.parseInt(item.id, 10)
    return Number.isNaN(sequence) ? max : Math.max(max, sequence)
  }, 0)

  return `测试 ${maxSequence + 1}`
}

/** 把测试名转换为路由用的 testId，如「测试 13」→「test13」。 */
export function toTestId(name: string): string {
  const match = name.match(/\d+/)
  if (match) {
    return `test${match[0]}`
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug ? `test-${slug}` : `test-${Date.now()}`
}

export type TestHistoryFilters = {
  keyword?: string
  status?: TestHistoryStatus | 'all'
  startDate?: string
  endDate?: string
}

export type InvocationLogFilters = {
  status?: InvocationLogStatus | 'all'
  startDate?: string
  endDate?: string
}

export type PaginatedResult<T> = {
  items: T[]
  page: number
  totalPages: number
}

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDateBoundary(value: string, endOfDay: boolean): number | undefined {
  const dateOnlyMatch = dateOnlyPattern.exec(value)

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ).getTime()
  }

  const timestamp = Date.parse(value.replace(' ', 'T'))
  return Number.isNaN(timestamp) ? undefined : timestamp
}

function isWithinDateRange(value: string, startDate?: string, endDate?: string): boolean {
  const timestamp = parseDateBoundary(value, false)

  if (timestamp === undefined) {
    return false
  }

  const startTimestamp = startDate ? parseDateBoundary(startDate, false) : undefined
  const endTimestamp = endDate ? parseDateBoundary(endDate, true) : undefined

  return !(
    (startTimestamp !== undefined && timestamp < startTimestamp) ||
    (endTimestamp !== undefined && timestamp > endTimestamp)
  )
}

export function filterTestHistory(
  items: readonly TestHistoryItem[],
  filters: TestHistoryFilters = {},
): TestHistoryItem[] {
  const keyword = filters.keyword?.trim().toLocaleLowerCase()

  return items.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.name.toLocaleLowerCase().includes(keyword) ||
      item.executor.toLocaleLowerCase().includes(keyword)
    const matchesStatus =
      !filters.status || filters.status === 'all' || item.status === filters.status

    return (
      matchesKeyword &&
      matchesStatus &&
      isWithinDateRange(item.executedAt, filters.startDate, filters.endDate)
    )
  })
}

export function filterInvocationLogs(
  logs: readonly InvocationLog[],
  filters: InvocationLogFilters = {},
): InvocationLog[] {
  return logs.filter(
    (log) =>
      (!filters.status || filters.status === 'all' || log.status === filters.status) &&
      isWithinDateRange(log.invokedAt, filters.startDate, filters.endDate),
  )
}

export function paginate<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
): PaginatedResult<T> {
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1)
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize))
  const page = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1))
  const startIndex = (page - 1) * safePageSize

  return {
    items: items.slice(startIndex, startIndex + safePageSize),
    page,
    totalPages,
  }
}

export function toCsvCell(value: string | number): string {
  const text = String(value)

  if (!/[",\r\n]/.test(text)) {
    return text
  }

  return `"${text.replaceAll('"', '""')}"`
}

const invocationCsvColumns = [
  ['调用时间', (log: InvocationLog) => log.invokedAt],
  ['请求方法', (log: InvocationLog) => log.method],
  ['API 名称', (log: InvocationLog) => log.apiName ?? ''],
  ['请求路径', (log: InvocationLog) => log.path],
  ['状态码', (log: InvocationLog) => log.statusCode],
  ['执行状态', (log: InvocationLog) => log.status],
  ['耗时（毫秒）', (log: InvocationLog) => log.durationMs],
] as const

export function buildInvocationCsv(logs: readonly InvocationLog[]): string {
  const header = invocationCsvColumns.map(([label]) => toCsvCell(label)).join(',')
  const rows = logs.map((log) =>
    invocationCsvColumns.map(([, getValue]) => toCsvCell(getValue(log))).join(','),
  )

  return [header, ...rows].join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename
  link.hidden = true
  document.body.append(link)

  try {
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(objectUrl)
  }
}
