import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { httpMethods } from '@/shared/enums/http-method'
import type {
  InvocationLogFilters,
  InvocationLogStatus,
} from '@/modules/invocation-log/types/invocation-log'

type InvocationLogFilterBarProps = {
  value: InvocationLogFilters
  onChange: (filters: InvocationLogFilters) => void
}

/** Select 占位用「全部」选项值（空字符串无法作为 SelectItem value）。 */
const ALL = '__all__'

const statusOptions: Array<{ value: InvocationLogStatus; label: string }> = [
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'timeout', label: '超时' },
]

export function InvocationLogFilterBar({ value, onChange }: InvocationLogFilterBarProps) {
  const patch = (next: Partial<InvocationLogFilters>) => onChange({ ...value, ...next })

  const hasActiveFilters = Object.values(value).some((field) => field != null && field !== '')

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
        <Label htmlFor="invocation-filter-api">API 名称 / 路径</Label>
        <Input
          id="invocation-filter-api"
          placeholder="例如订单查询或 /orders…"
          value={value.apiName ?? ''}
          onChange={(event) => patch({ apiName: event.target.value })}
        />
      </div>

      <div className="flex w-[140px] flex-col gap-1.5">
        <Label>请求方法</Label>
        <Select
          value={value.method ?? ALL}
          onValueChange={(next) =>
            patch({ method: next === ALL ? undefined : (next as InvocationLogFilters['method']) })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>全部</SelectItem>
            {httpMethods.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-[120px] flex-col gap-1.5">
        <Label htmlFor="invocation-filter-code">状态码</Label>
        <Input
          id="invocation-filter-code"
          inputMode="numeric"
          placeholder="例如 200…"
          value={value.statusCode ?? ''}
          onChange={(event) =>
            patch({ statusCode: event.target.value.replace(/[^0-9]/g, '') })
          }
        />
      </div>

      <div className="flex w-[140px] flex-col gap-1.5">
        <Label>执行状态</Label>
        <Select
          value={value.status ?? ALL}
          onValueChange={(next) =>
            patch({ status: next === ALL ? undefined : (next as InvocationLogStatus) })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>全部</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-[170px] flex-col gap-1.5">
        <Label htmlFor="invocation-filter-start">开始日期</Label>
        <Input
          id="invocation-filter-start"
          type="date"
          value={value.startDate ?? ''}
          max={value.endDate || undefined}
          onChange={(event) => patch({ startDate: event.target.value || undefined })}
        />
      </div>

      <div className="flex w-[170px] flex-col gap-1.5">
        <Label htmlFor="invocation-filter-end">结束日期</Label>
        <Input
          id="invocation-filter-end"
          type="date"
          value={value.endDate ?? ''}
          min={value.startDate || undefined}
          onChange={(event) => patch({ endDate: event.target.value || undefined })}
        />
      </div>

      <div className="flex items-center gap-2">
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={() => onChange({})}>
            <X className="mr-1 h-4 w-4" />
            重置
          </Button>
        ) : (
          <span className="inline-flex items-center text-sm text-slate-400">
            <Search className="mr-1 h-4 w-4" />
            筛选
          </span>
        )}
      </div>
    </div>
  )
}
