import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InvocationLogSection } from './invocation-log-section'

vi.mock('@/modules/invocation-log/hooks/use-invocation-logs-query', () => ({
  useInvocationLogsQuery: vi.fn(),
}))

import { useInvocationLogsQuery } from '@/modules/invocation-log/hooks/use-invocation-logs-query'

const mockedUseQuery = vi.mocked(useInvocationLogsQuery)

const mockLog = {
  id: 'inv_001',
  invokedAt: '2026-06-27T14:32:10.000Z',
  method: 'GET',
  apiName: '订单列表',
  path: '/api/order/list',
  statusCode: 200,
  status: 'success',
  durationMs: 45,
} as const

describe('InvocationLogSection', () => {
  it('renders table rows when data is loaded', () => {
    mockedUseQuery.mockReturnValue({
      data: {
        items: [{ ...mockLog }],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useInvocationLogsQuery>)

    render(<InvocationLogSection />)
    expect(screen.getByText('订单列表')).toBeTruthy()
    expect(screen.getByText('GET')).toBeTruthy()
  })

  it('renders loading state', () => {
    mockedUseQuery.mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useInvocationLogsQuery>)

    render(<InvocationLogSection />)
    expect(screen.queryByText('订单列表')).toBeFalsy()
    expect(screen.queryAllByText('调用时间').length).toBeGreaterThan(0)
  })

  it('renders error state with retry button', () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('加载失败'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInvocationLogsQuery>)

    render(<InvocationLogSection />)
    expect(screen.getByText('加载调用日志失败')).toBeTruthy()
    expect(screen.getByText('重试')).toBeTruthy()
  })

  it('renders pagination when total > pageSize', () => {
    mockedUseQuery.mockReturnValue({
      data: {
        items: [{ ...mockLog }],
        total: 25,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useInvocationLogsQuery>)

    render(<InvocationLogSection />)
    expect(screen.getByText('订单列表')).toBeTruthy()
    expect(screen.getByText('第 1 / 3 页')).toBeTruthy()
  })

  it('renders empty state when no logs', () => {
    mockedUseQuery.mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useInvocationLogsQuery>)

    render(<InvocationLogSection />)
    expect(screen.getByText('暂无调用日志')).toBeTruthy()
  })
})
