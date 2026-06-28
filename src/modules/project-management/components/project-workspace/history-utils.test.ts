import { afterEach, describe, expect, it, vi } from 'vitest'

import type { InvocationLog } from '@/modules/invocation-log'
import {
  buildInvocationCsv,
  downloadCsv,
  filterInvocationLogs,
  filterTestHistory,
  paginate,
  toCsvCell,
  type TestHistoryItem,
} from '@/modules/project-management/components/project-workspace/history-utils'

const testHistory: TestHistoryItem[] = [
  {
    id: 'test-1',
    name: 'Order Query',
    executedAt: '2024-06-07 00:00:00',
    durationMs: 120,
    executor: 'Admin',
    status: 'success',
  },
  {
    id: 'test-2',
    name: 'Customer lookup',
    executedAt: '2024-06-08 23:59:59',
    durationMs: 80,
    executor: 'Reviewer',
    status: 'failed',
  },
]

const invocationLogs: InvocationLog[] = [
  {
    id: 'inv-1',
    invokedAt: '2024-06-07 00:00:00',
    method: 'GET',
    apiName: 'Order query',
    path: '/orders',
    statusCode: 200,
    status: 'success',
    durationMs: 42,
  },
  {
    id: 'inv-2',
    invokedAt: '2024-06-08 23:59:59',
    method: 'POST',
    apiName: 'Create, "order"',
    path: '/orders',
    statusCode: 500,
    status: 'failed',
    durationMs: 73,
  },
  {
    id: 'inv-3',
    invokedAt: '2024-06-09 00:00:00',
    method: 'GET',
    path: '/health',
    statusCode: 504,
    status: 'timeout',
    durationMs: 5_000,
  },
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('filterTestHistory', () => {
  it('matches names and executors without regard to case', () => {
    expect(filterTestHistory(testHistory, { keyword: 'ORDER' })).toEqual([testHistory[0]])
    expect(filterTestHistory(testHistory, { keyword: 'reviewer' })).toEqual([testHistory[1]])
  })

  it('combines status and inclusive date filters', () => {
    expect(
      filterTestHistory(testHistory, {
        status: 'failed',
        startDate: '2024-06-08',
        endDate: '2024-06-08',
      }),
    ).toEqual([testHistory[1]])
  })
})

describe('filterInvocationLogs', () => {
  it('matches statuses and includes both date endpoints', () => {
    expect(
      filterInvocationLogs(invocationLogs, {
        status: 'failed',
        startDate: '2024-06-08',
        endDate: '2024-06-08',
      }),
    ).toEqual([invocationLogs[1]])
  })

  it('returns all rows when filters are empty or set to all', () => {
    expect(filterInvocationLogs(invocationLogs, { status: 'all' })).toEqual(invocationLogs)
  })
})

describe('paginate', () => {
  it('slices items and clamps the requested page', () => {
    expect(paginate([1, 2, 3], 2, 2)).toEqual({ items: [3], page: 2, totalPages: 2 })
    expect(paginate([1, 2, 3], 99, 2)).toEqual({ items: [3], page: 2, totalPages: 2 })
    expect(paginate([], -1, 10)).toEqual({ items: [], page: 1, totalPages: 1 })
  })
})

describe('CSV helpers', () => {
  it('escapes commas, quotes, and line breaks', () => {
    expect(toCsvCell('a,"b"')).toBe('"a,""b"""')
    expect(toCsvCell('first\nsecond')).toBe('"first\nsecond"')
    expect(toCsvCell(42)).toBe('42')
  })

  it('builds invocation rows in a stable column order', () => {
    expect(buildInvocationCsv([invocationLogs[1]])).toBe(
      [
        '调用时间,请求方法,API 名称,请求路径,状态码,执行状态,耗时（毫秒）',
        '2024-06-08 23:59:59,POST,"Create, ""order""",/orders,500,failed,73',
      ].join('\r\n'),
    )
  })

  it('isolates browser APIs and cleans up its temporary download link', () => {
    const objectUrl = 'blob:invocation-export'
    const createObjectURL = vi.fn((blob: Blob) => {
      void blob
      return objectUrl
    })
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    downloadCsv('invocations.csv', 'id\r\ninv-1')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download="invocations.csv"]')).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl)
  })
})
