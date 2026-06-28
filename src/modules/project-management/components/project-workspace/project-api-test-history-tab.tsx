import { Search, User } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { CodeEditorShell } from '@/components/editors/code-editor-shell'
import { JsonCodeEditor } from '@/components/editors/json-code-editor'
import { JsonCodeViewer } from '@/components/editors/json-code-viewer'
import {
  filterTestHistory,
  paginate,
  testHistoryItems,
  type TestHistoryItem,
  type TestHistoryStatus,
} from '@/modules/project-management/components/project-workspace/history-utils'
import {
  buildRequestBodyTemplate,
  validateRequestBody,
} from '@/modules/project-management/components/project-workspace/request-body-utils'
import { formatDateTimeWithoutYear } from '@/modules/invocation-log/utils/format-date-time'
import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

type ProjectApiTestHistoryTabProps = {
  apiDefinition: ApiDefinitionDraft
  /** 当前选中的测试 testId（如 "test13"）。未提供时默认选中第一个测试。 */
  selectedTestId?: string
  /** 选中某个测试时回调，由上层负责更新路由。 */
  onSelectTest?: (testId: string) => void
}

const pageSize = 10

/** 列表项 id（"13"）↔ 路由 testId（"test13"）互转。 */
function itemIdToTestId(id: string): string {
  return `test${id}`
}

function testIdToItemId(testId?: string): string | undefined {
  return testId?.match(/\d+/)?.[0]
}

const executionLogs = [
  ['1', '发起请求', '发送 POST /api/v1/order/query', '128ms', '14:35:42'],
  ['2', '路由匹配', '匹配路由与权限校验', '32ms', '14:35:42'],
  ['3', '参数校验', '校验请求参数合法性', '8ms', '14:35:42'],
  ['4', '业务处理', '执行业务逻辑和 SQL 查询', '56ms', '14:35:42'],
  ['5', '响应数据返回', '返回响应结果', '98ms', '14:35:43'],
  ['6', '结束响应', '返回响应结束', '50ms', '14:35:43'],
]

const bodyContentTypeLabels: Record<ApiDefinitionDraft['bodyContentType'], string> = {
  json: 'Body / JSON',
  'form-data': 'Body / form-data',
  'x-www-form-urlencoded': 'Body / x-www-form-urlencoded',
}

function buildResponseBody() {
  return {
    code: 0,
    msg: 'success',
    data: {
      pageNo: 1,
      pageSize: 20,
      total: 128,
      totalPages: 7,
      list: [
        {
          orderId: 'ORD202406070001',
          customerName: '张三',
          status: '已完成',
          amount: 599,
          createTime: '2024-06-07 14:20:15',
        },
        {
          orderId: 'ORD202406070022',
          customerName: '李四',
          status: '已取消',
          amount: 199,
          createTime: '2024-06-07 14:18:33',
        },
      ],
    },
  }
}

function StatusBadge({ status }: { status: TestHistoryStatus }) {
  return (
    <Badge variant={status === 'success' ? 'success' : 'destructive'}>
      {status === 'success' ? '成功' : '失败'}
    </Badge>
  )
}

export function ProjectApiTestHistoryTab({
  apiDefinition,
  selectedTestId,
  onSelectTest,
}: ProjectApiTestHistoryTabProps) {
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<TestHistoryStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const bodyParams = useMemo(
    () => apiDefinition.requestParams.filter((param) => param.location === 'body'),
    [apiDefinition],
  )
  const initialRequestBody = useMemo(
    () => JSON.stringify(buildRequestBodyTemplate(bodyParams), null, 2),
    [bodyParams],
  )
  const [requestBody, setRequestBody] = useState(initialRequestBody)
  const validateBody = useCallback(
    (parsed: unknown) => validateRequestBody(parsed, bodyParams),
    [bodyParams],
  )
  const responseBody = useMemo(() => buildResponseBody(), [])

  // 路由里的 testId 可能是新建的、尚不在历史列表中的测试，
  // 这里合成一个占位项，让它出现在列表顶部并可被选中。
  const items = useMemo<TestHistoryItem[]>(() => {
    const itemId = testIdToItemId(selectedTestId)
    if (!itemId || testHistoryItems.some((item) => item.id === itemId)) {
      return testHistoryItems
    }

    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const executedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

    const draftItem: TestHistoryItem = {
      id: itemId,
      name: `测试 ${itemId}`,
      executedAt,
      durationMs: 0,
      executor: '当前用户',
      status: 'success',
    }
    return [draftItem, ...testHistoryItems]
  }, [selectedTestId])

  const filteredHistory = useMemo(
    () => filterTestHistory(items, { keyword, status }),
    [items, keyword, status],
  )
  const pagedHistory = useMemo(
    () => paginate(filteredHistory, page, pageSize),
    [filteredHistory, page],
  )
  const selectedHistory =
    items.find((item) => itemIdToTestId(item.id) === selectedTestId) ?? items[0]

  // 当所属 API 定义变化时，重置可编辑的请求体为最新示例值
  useEffect(() => {
    setRequestBody(initialRequestBody)
  }, [initialRequestBody])

  const handleSelect = (item: TestHistoryItem) => {
    onSelectTest?.(itemIdToTestId(item.id))
  }

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    setPage(1)
  }

  const handleStatusChange = (value: TestHistoryStatus | 'all') => {
    setStatus(value)
    setPage(1)
  }

  return (
    <ResizablePanelGroup
      autoSaveId="project-api-test-history-layout"
      orientation="horizontal"
      className="h-full min-h-0"
    >
      {/* 左：测试列表 */}
      <ResizablePanel id="list" className="min-w-0" defaultSize="32%" minSize="22%" maxSize="46%">
        <Card className="flex h-full min-h-0 flex-col bg-white">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_132px]">
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={keyword}
                  onChange={(event) => handleKeywordChange(event.target.value)}
                  placeholder="搜索测试名称或执行人…"
                  aria-label="搜索测试名称或执行人"
                  name="test-history-search"
                  autoComplete="off"
                  className="pl-9"
                />
              </div>
              <Select value={status} onValueChange={(value) => handleStatusChange(value as TestHistoryStatus | 'all')}>
                <SelectTrigger aria-label="筛选测试状态">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-auto overscroll-contain">
              {pagedHistory.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-primary/40 hover:shadow-sm',
                    item.id === selectedHistory?.id && 'border-primary shadow-sm ring-1 ring-primary/20',
                  )}
                  onClick={() => handleSelect(item)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900">
                      测试 #{item.id} / {item.name}
                    </h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-medium text-slate-600">
                    <span className="tabular-nums">{formatDateTimeWithoutYear(item.executedAt)}</span>
                    <span className="tabular-nums">耗时 {item.durationMs}ms</span>
                    <span className="inline-flex items-center gap-1">
                      <User aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                      {item.executor}
                    </span>
                  </div>
                </button>
              ))}
              {!pagedHistory.items.length ? (
                <div className="rounded-md border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
                  暂无匹配的测试记录
                </div>
              ) : null}
            </div>

            {pagedHistory.totalPages > 1 ? (
              <Pagination
                page={pagedHistory.page}
                pageSize={pageSize}
                total={filteredHistory.length}
                onPageChange={setPage}
                showInfo={false}
                className="h-10 shrink-0 justify-center"
              />
            ) : null}
          </CardContent>
        </Card>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* 右：测试详情 */}
      <ResizablePanel id="detail" className="min-w-0" defaultSize="68%">
        <div className="flex h-full min-h-0 flex-col gap-3">
          {/* 第一行：请求方法 + 地址 */}
          <Card className="shrink-0 bg-white">
            <CardContent className="flex items-center gap-3 py-3">
              {selectedHistory ? (
                <>
                  <span className="max-w-[40%] shrink-0 truncate text-sm font-semibold text-slate-900">
                    {selectedHistory.name}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-slate-300">
                    |
                  </span>
                </>
              ) : null}
              <Badge variant="secondary" className="shrink-0 font-mono">
                {apiDefinition.method}
              </Badge>
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700">
                {apiDefinition.path}
              </span>
            </CardContent>
          </Card>

          {/* 第二行：请求参数 与 响应结果 并列，左右平分、等高 */}
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
            <Card className="flex min-h-0 flex-col overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-200">
                <CardTitle>请求参数（{bodyContentTypeLabels[apiDefinition.bodyContentType]}）</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col pt-4">
                <CodeEditorShell flex>
                  <JsonCodeEditor value={requestBody} onChange={setRequestBody} validate={validateBody} />
                </CodeEditorShell>
              </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-col overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-200">
                <CardTitle>响应结果</CardTitle>
                <Badge
                  variant={
                    !selectedHistory
                      ? 'secondary'
                      : selectedHistory.status === 'success'
                        ? 'success'
                        : 'destructive'
                  }
                >
                  {!selectedHistory
                    ? '无匹配记录'
                    : selectedHistory.status === 'success'
                      ? '200 OK'
                      : '500 ERROR'}
                </Badge>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-1 text-sm font-medium text-slate-700">
                  <span className="tabular-nums">耗时：{selectedHistory?.durationMs ?? 0}ms</span>
                  <span>大小：2.45KB</span>
                </div>
                <CodeEditorShell flex>
                  <JsonCodeViewer value={responseBody} />
                </CodeEditorShell>
              </CardContent>
            </Card>
          </div>

          {/* 第三行：执行日志 */}
          <Card className="flex max-h-[40%] min-h-0 shrink-0 flex-col overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-200">
              <CardTitle>执行日志</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-auto pt-4">
              <div className="rounded-md border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">步骤</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>接口</TableHead>
                      <TableHead className="w-20 text-right">耗时</TableHead>
                      <TableHead className="w-20">时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executionLogs.map((log) => (
                      <TableRow key={log[0]}>
                        <TableCell>{log[0]}</TableCell>
                        <TableCell>{log[1]}</TableCell>
                        <TableCell>{log[2]}</TableCell>
                        <TableCell className="text-right tabular-nums">{log[3]}</TableCell>
                        <TableCell className="tabular-nums">{log[4]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
