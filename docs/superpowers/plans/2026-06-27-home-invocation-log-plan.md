# 首页调用日志组件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页最下方添加一个展示最近 API 调用日志的表格组件，支持分页，使用 mock 数据。

**Architecture:** 后端在 `home-overview.route.ts` 新增 `GET /api/home/invocations` 路由返回内存 mock 数据；前端在 `home` 模块新增 API 服务、Query Key、Hook 和展示组件，遵循现有 TanStack Query + shadcn/ui 模式。

**Tech Stack:** React, TypeScript, TanStack Query, Hono, shadcn/ui, Vitest

---

## File Map

| 文件 | 职责 |
|------|------|
| `src/server/routes/home-overview.route.ts` | 新增 `GET /api/home/invocations`，返回 mock 调用日志和分页信息 |
| `src/modules/home/services/invocation-log.api.ts` | DTO 类型 + `getInvocationLogs` 请求函数 |
| `src/modules/home/services/invocation-log-query-keys.ts` | TanStack Query key 工厂 |
| `src/modules/home/hooks/use-invocation-logs-query.ts` | `useQuery` hook 封装 |
| `src/modules/home/components/invocation-log-method-badge.tsx` | HTTP 方法颜色 Badge |
| `src/modules/home/components/invocation-log-table.tsx` | 调用日志表格 |
| `src/modules/home/components/invocation-log-pagination.tsx` | 分页控件 |
| `src/modules/home/components/invocation-log-section.tsx` | 容器组件：标题、表格、分页、加载/错误/空状态 |
| `src/modules/home/pages/home-overview-page.tsx` | 在页面最下方引入 `InvocationLogSection` |
| `src/server/routes/home-overview.route.test.ts` | 后端路由测试 |
| `src/modules/home/components/invocation-log-section.test.tsx` | 前端组件测试 |

---

### Task 1: 后端 mock 调用日志数据

**Files:**
- Modify: `src/server/routes/home-overview.route.ts`
- Test: `src/server/routes/home-overview.route.test.ts`

- [ ] **Step 1: 编写失败测试**

在 `src/server/routes/home-overview.route.test.ts` 中：

```ts
import { describe, expect, it } from 'vitest'

import { homeOverviewRoute } from '@/server/routes/home-overview.route'

describe('GET /api/home/invocations', () => {
  it('returns paginated mock invocation logs', async () => {
    const response = await homeOverviewRoute.request('/invocations?page=1&pageSize=10')
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.items).toHaveLength(10)
    expect(body.total).toBeGreaterThan(10)
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(10)

    const first = body.items[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('timestamp')
    expect(first).toHaveProperty('method')
    expect(first).toHaveProperty('apiName')
    expect(first).toHaveProperty('apiPath')
    expect(first).toHaveProperty('statusCode')
    expect(first).toHaveProperty('status')
    expect(first).toHaveProperty('durationMs')
  })

  it('returns second page correctly', async () => {
    const response = await homeOverviewRoute.request('/invocations?page=2&pageSize=10')
    const body = await response.json()
    expect(body.page).toBe(2)
    expect(body.items.length).toBeGreaterThan(0)
  })

  it('defaults to page 1 and pageSize 10', async () => {
    const response = await homeOverviewRoute.request('/invocations')
    const body = await response.json()
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(10)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- src/server/routes/home-overview.route.test.ts
```

Expected: FAIL，路由 `/invocations` 不存在或返回 404。

- [ ] **Step 3: 实现 mock 数据与路由**

修改 `src/server/routes/home-overview.route.ts`，在文件顶部新增 mock 数据，在路由链末尾新增 `GET /invocations`：

```ts
const mockInvocationLogs = [
  {
    id: 'inv_001',
    timestamp: '2026-06-27T14:32:10.000Z',
    method: 'GET',
    apiName: '订单列表',
    apiPath: '/api/order/list',
    statusCode: 200,
    status: 'success',
    durationMs: 45,
  },
  // 至少 25 条，覆盖 GET/POST/PUT/DELETE/PATCH、200/201/400/500、success/failure
]
```

新增路由：

```ts
homeOverviewRoute.get('/invocations', (context) => {
  const rawPage = Number(context.req.query('page') ?? '1')
  const rawPageSize = Number(context.req.query('pageSize') ?? '10')
  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const pageSize = Number.isNaN(rawPageSize) || rawPageSize < 1 ? 10 : rawPageSize

  const total = mockInvocationLogs.length
  const start = (page - 1) * pageSize
  const items = mockInvocationLogs.slice(start, start + pageSize)

  return context.json({ items, total, page, pageSize })
})
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test -- src/server/routes/home-overview.route.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/home-overview.route.ts src/server/routes/home-overview.route.test.ts
git commit -m "feat(server): add GET /api/home/invocations with mock data"
```

---

### Task 2: 前端 API 服务与 Query Hook

**Files:**
- Create: `src/modules/home/services/invocation-log.api.ts`
- Create: `src/modules/home/services/invocation-log-query-keys.ts`
- Create: `src/modules/home/hooks/use-invocation-logs-query.ts`

- [ ] **Step 1: 创建 API 服务**

`src/modules/home/services/invocation-log.api.ts`：

```ts
import { apiFetch } from '@/lib/api-fetch'

export type InvocationLog = {
  id: string
  timestamp: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  apiName: string
  apiPath: string
  statusCode: number
  status: 'success' | 'failure'
  durationMs: number
}

export type InvocationLogsResponse = {
  items: InvocationLog[]
  total: number
  page: number
  pageSize: number
}

export function getInvocationLogs(page = 1, pageSize = 10) {
  return apiFetch<InvocationLogsResponse>(`/api/home/invocations?page=${page}&pageSize=${pageSize}`)
}
```

- [ ] **Step 2: 创建 Query Keys**

`src/modules/home/services/invocation-log-query-keys.ts`：

```ts
export const invocationLogQueryKeys = {
  all: ['invocationLogs'] as const,
  list: (page: number, pageSize: number) =>
    [...invocationLogQueryKeys.all, 'list', { page, pageSize }] as const,
}
```

- [ ] **Step 3: 创建 Query Hook**

`src/modules/home/hooks/use-invocation-logs-query.ts`：

```ts
import { useQuery } from '@tanstack/react-query'

import { getInvocationLogs } from '@/modules/home/services/invocation-log.api'
import { invocationLogQueryKeys } from '@/modules/home/services/invocation-log-query-keys'

export function useInvocationLogsQuery(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: invocationLogQueryKeys.list(page, pageSize),
    queryFn: () => getInvocationLogs(page, pageSize),
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/home/services/invocation-log.api.ts \
  src/modules/home/services/invocation-log-query-keys.ts \
  src/modules/home/hooks/use-invocation-logs-query.ts
git commit -m "feat(home): add invocation log api service and query hook"
```

---

### Task 3: 方法 Badge 组件

**Files:**
- Create: `src/modules/home/components/invocation-log-method-badge.tsx`

- [ ] **Step 1: 实现组件**

```tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

type InvocationLogMethodBadgeProps = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
}

const methodStyles: Record<InvocationLogMethodBadgeProps['method'], string> = {
  GET: 'bg-blue-50 text-blue-700 border-blue-200',
  POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
  PATCH: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function InvocationLogMethodBadge({ method }: InvocationLogMethodBadgeProps) {
  return (
    <Badge className={cn('text-[10px] font-semibold', methodStyles[method])} variant="outline">
      {method}
    </Badge>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/home/components/invocation-log-method-badge.tsx
git commit -m "feat(home): add invocation log method badge component"
```

---

### Task 4: 调用日志表格组件

**Files:**
- Create: `src/modules/home/components/invocation-log-table.tsx`

- [ ] **Step 1: 实现组件**

```tsx
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InvocationLogMethodBadge } from '@/modules/home/components/invocation-log-method-badge'
import type { InvocationLog } from '@/modules/home/services/invocation-log.api'
import { formatDateTime } from '@/modules/home/utils/format-date-time'

type InvocationLogTableProps = {
  logs?: InvocationLog[]
  loading?: boolean
}

export function InvocationLogTable({ logs = [], loading }: InvocationLogTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">暂无调用日志</div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>时间</TableHead>
          <TableHead>方法</TableHead>
          <TableHead>API 名称</TableHead>
          <TableHead>路径</TableHead>
          <TableHead>状态码</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>耗时</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{formatDateTime(log.timestamp)}</TableCell>
            <TableCell>
              <InvocationLogMethodBadge method={log.method} />
            </TableCell>
            <TableCell>{log.apiName}</TableCell>
            <TableCell className="font-mono text-slate-600">{log.apiPath}</TableCell>
            <TableCell>{log.statusCode}</TableCell>
            <TableCell>
              <span
                className={
                  log.status === 'success'
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }
              >
                {log.status === 'success' ? '成功' : '失败'}
              </span>
            </TableCell>
            <TableCell>{log.durationMs}ms</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" disabled>
                详情
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 2: 创建日期格式化工具**

`src/modules/home/utils/format-date-time.ts`：

```ts
export function formatDateTime(isoString: string) {
  const date = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/home/components/invocation-log-table.tsx \
  src/modules/home/utils/format-date-time.ts
git commit -m "feat(home): add invocation log table and date formatter"
```

---

### Task 5: 分页组件

**Files:**
- Create: `src/modules/home/components/invocation-log-pagination.tsx`

- [ ] **Step 1: 实现组件**

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

type InvocationLogPaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function InvocationLogPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: InvocationLogPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  return (
    <div className="flex items-center justify-end gap-2 px-3 py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={!canGoPrev}
      >
        <ChevronLeft className="mr-1 h-3.5 w-3.5" />
        上一页
      </Button>
      <span className="text-xs text-slate-600">
        第 {page} / {totalPages} 页
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!canGoNext}
      >
        下一页
        <ChevronRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/home/components/invocation-log-pagination.tsx
git commit -m "feat(home): add invocation log pagination component"
```

---

### Task 6: 容器组件

**Files:**
- Create: `src/modules/home/components/invocation-log-section.tsx`
- Test: `src/modules/home/components/invocation-log-section.test.tsx`

- [ ] **Step 1: 编写失败测试**

`src/modules/home/components/invocation-log-section.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InvocationLogSection } from './invocation-log-section'

vi.mock('@/modules/home/hooks/use-invocation-logs-query', () => ({
  useInvocationLogsQuery: vi.fn(),
}))

import { useInvocationLogsQuery } from '@/modules/home/hooks/use-invocation-logs-query'

const mockedUseQuery = vi.mocked(useInvocationLogsQuery)

describe('InvocationLogSection', () => {
  it('renders table rows when data is loaded', () => {
    mockedUseQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 'inv_001',
            timestamp: '2026-06-27T14:32:10.000Z',
            method: 'GET',
            apiName: '订单列表',
            apiPath: '/api/order/list',
            statusCode: 200,
            status: 'success',
            durationMs: 45,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useInvocationLogsQuery>)

    render(<InvocationLogSection />)
    expect(screen.getByText('订单列表')).toBeInTheDocument()
    expect(screen.getByText('GET')).toBeInTheDocument()
  })

  it('renders empty state when no logs', () => {
    mockedUseQuery.mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useInvocationLogsQuery>)

    render(<InvocationLogSection />)
    expect(screen.getByText('暂无调用日志')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- src/modules/home/components/invocation-log-section.test.tsx
```

Expected: FAIL，`InvocationLogSection` 不存在。

- [ ] **Step 3: 实现容器组件**

`src/modules/home/components/invocation-log-section.tsx`：

```tsx
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { InvocationLogPagination } from '@/modules/home/components/invocation-log-pagination'
import { InvocationLogTable } from '@/modules/home/components/invocation-log-table'
import { useInvocationLogsQuery } from '@/modules/home/hooks/use-invocation-logs-query'

export function InvocationLogSection() {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const query = useInvocationLogsQuery(page, pageSize)

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">调用日志</h2>
        <p className="text-sm text-slate-500">最近 API 调用记录。</p>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        {query.error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-slate-500">
            <p>加载调用日志失败</p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>重试</Button>
          </div>
        ) : (
          <>
            <InvocationLogTable logs={query.data?.items} loading={query.isLoading} />
            {query.data && query.data.total > pageSize && (
              <InvocationLogPagination
                page={query.data.page}
                pageSize={query.data.pageSize}
                total={query.data.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test -- src/modules/home/components/invocation-log-section.test.tsx
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/modules/home/components/invocation-log-section.tsx \
  src/modules/home/components/invocation-log-section.test.tsx
git commit -m "feat(home): add invocation log section component"
```

---

### Task 7: 首页集成

**Files:**
- Modify: `src/modules/home/pages/home-overview-page.tsx`

- [ ] **Step 1: 引入并放置组件**

```tsx
import { AppPage } from '@/layouts/app-shell/app-page'
import { InvocationLogSection } from '@/modules/home/components/invocation-log-section'
import { MetricGrid } from '@/modules/home/components/metric-grid'
import { RecentProjectsSection } from '@/modules/home/components/recent-projects-section'
import { useHomeOverviewQuery } from '@/modules/home/hooks/use-home-overview-query'

export function HomeOverviewPage() {
  const query = useHomeOverviewQuery()

  return (
    <AppPage
      title={
        <div>
          <h1 className="text-base font-semibold text-slate-900">首页</h1>
          <p className="text-sm text-slate-500">查看平台概况和最近项目。</p>
        </div>
      }
    >
      <div className="h-full space-y-5 overflow-auto p-5">
        <MetricGrid metrics={query.data?.metrics} />
        <RecentProjectsSection projects={query.data?.recentProjects ?? []} loading={query.isLoading} />
        <InvocationLogSection />
      </div>
    </AppPage>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/home/pages/home-overview-page.tsx
git commit -m "feat(home): add invocation log section to home page"
```

---

### Task 8: 全量验证

- [ ] **Step 1: 类型检查**

```bash
pnpm typecheck
```

Expected: PASS。

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: PASS。

- [ ] **Step 3: 运行全部测试**

```bash
pnpm test
```

Expected: PASS。

- [ ] **Step 4: 构建前端**

```bash
pnpm build
```

Expected: PASS。

- [ ] **Step 5: Commit 验证结果（可选）**

```bash
git add -A
git commit -m "chore(home): verify invocation log integration"
```

---

## Spec Coverage 自检

| Spec 要求 | 对应任务 |
|---|---|
| 后端新增 `GET /api/home/invocations` 路由 | Task 1 |
| mock 数据覆盖不同方法/状态码/状态/耗时 | Task 1 |
| 前端 DTO 类型 + API 请求 | Task 2 |
| Query Key + Hook | Task 2 |
| 表格列：时间、方法、API 名称、路径、状态码、状态、耗时、操作 | Task 4 |
| 方法 Badge 颜色区分 | Task 3 |
| 分页控件 | Task 5 |
| 加载/错误/空状态 | Task 6 |
| 首页最下方引入 | Task 7 |
| 后端 + 前端测试 | Task 1, Task 6 |

## Placeholder 自检

- 无 TBD/TODO。
- 所有代码块包含完整代码。
- 所有测试包含断言。
- 类型/函数名在任务间一致。
