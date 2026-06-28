import { Download, Search } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  InvocationLogTable,
  mockInvocationLogs,
  type InvocationLogStatus,
} from '@/modules/invocation-log'
import {
  buildInvocationCsv,
  downloadCsv,
  filterInvocationLogs,
  paginate,
} from '@/modules/project-management/components/project-workspace/history-utils'
import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

type ProjectApiInvocationLogTabProps = {
  apiDefinition: ApiDefinitionDraft
}

type FilterState = {
  startDate: string
  endDate: string
  status: InvocationLogStatus | 'all'
}

const pageSize = 10
const initialFilters: FilterState = { startDate: '', endDate: '', status: 'all' }
const numberFormatter = new Intl.NumberFormat('zh-CN')

export function ProjectApiInvocationLogTab({ apiDefinition }: ProjectApiInvocationLogTabProps) {
  const [draftFilters, setDraftFilters] = useState<FilterState>(initialFilters)
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [page, setPage] = useState(1)
  const apiLogs = useMemo(
    () =>
      mockInvocationLogs.filter(
        (log) => log.method === apiDefinition.method && log.path === apiDefinition.path,
      ),
    [apiDefinition.method, apiDefinition.path],
  )
  const filteredLogs = useMemo(
    () => filterInvocationLogs(apiLogs, filters),
    [apiLogs, filters],
  )
  const pagedLogs = useMemo(
    () => paginate(filteredLogs, page, pageSize),
    [filteredLogs, page],
  )
  const metrics = useMemo(() => {
    const successCount = filteredLogs.filter((log) => log.status === 'success').length
    const anomalyCount = filteredLogs.length - successCount
    const averageDuration = filteredLogs.length
      ? Math.round(filteredLogs.reduce((total, log) => total + log.durationMs, 0) / filteredLogs.length)
      : 0

    return [
      { label: '筛选结果', value: numberFormatter.format(filteredLogs.length), suffix: '次' },
      {
        label: '成功率',
        value: filteredLogs.length ? `${((successCount / filteredLogs.length) * 100).toFixed(1)}%` : '0.0%',
      },
      { label: '平均耗时', value: numberFormatter.format(averageDuration), suffix: 'ms' },
      { label: '异常数', value: numberFormatter.format(anomalyCount), suffix: '次' },
    ]
  }, [filteredLogs])

  const handleQuery = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFilters(draftFilters)
    setPage(1)
  }

  const handleReset = () => {
    setDraftFilters(initialFilters)
    setFilters(initialFilters)
    setPage(1)
  }

  const handleExport = () => {
    downloadCsv(
      `api-invocations-${new Date().toISOString().slice(0, 10)}.csv`,
      buildInvocationCsv(filteredLogs),
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-2xl font-semibold tabular-nums text-slate-950">{metric.value}</span>
                {metric.suffix ? (
                  <span className="pb-0.5 text-sm font-semibold text-slate-600">{metric.suffix}</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <form
        className="grid grid-cols-1 items-end gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(300px,1fr)_180px_auto]"
        onSubmit={handleQuery}
      >
        <fieldset className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-2">
          <legend className="mb-2 text-sm font-semibold text-slate-900">时间范围</legend>
          <Input
            type="date"
            value={draftFilters.startDate}
            max={draftFilters.endDate || undefined}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, startDate: event.target.value }))
            }
            aria-label="开始日期"
            name="invocation-start-date"
          />
          <span aria-hidden="true" className="text-center text-slate-400">至</span>
          <Input
            type="date"
            value={draftFilters.endDate}
            min={draftFilters.startDate || undefined}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, endDate: event.target.value }))
            }
            aria-label="结束日期"
            name="invocation-end-date"
          />
        </fieldset>

        <div>
          <label htmlFor="invocation-status" className="mb-2 block text-sm font-semibold text-slate-900">
            执行状态
          </label>
          <Select
            value={draftFilters.status}
            onValueChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                status: value as InvocationLogStatus | 'all',
              }))
            }
          >
            <SelectTrigger id="invocation-status">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="success">成功</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
              <SelectItem value="timeout">超时</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-1 xl:justify-end">
          <Button type="submit">
            <Search aria-hidden="true" className="mr-1.5 h-4 w-4" />
            查询
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>重置</Button>
          <Button type="button" variant="outline" onClick={handleExport} disabled={!filteredLogs.length}>
            <Download aria-hidden="true" className="mr-1.5 h-4 w-4" />
            导出
          </Button>
        </div>
      </form>

      <InvocationLogTable logs={pagedLogs.items} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
          <span className="tabular-nums">共 {numberFormatter.format(filteredLogs.length)} 条</span>
          <Badge variant="secondary" className="max-w-full truncate">{apiDefinition.path}</Badge>
        </div>
        <Pagination
          page={pagedLogs.page}
          pageSize={pageSize}
          total={filteredLogs.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
