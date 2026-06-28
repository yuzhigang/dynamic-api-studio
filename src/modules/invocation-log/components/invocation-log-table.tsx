import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/cn'
import type { InvocationLog, InvocationLogStatus } from '@/modules/invocation-log/types/invocation-log'
import { formatDateTime } from '@/modules/invocation-log/utils/format-date-time'

type InvocationLogTableProps = {
  logs?: InvocationLog[]
  loading?: boolean
  /** 为 true 时显示 API 名称列（首页需要，项目页不需要）。 */
  showApiName?: boolean
}

const statusLabels: Record<InvocationLogStatus, string> = {
  success: '成功',
  failed: '失败',
  timeout: '超时',
}

const statusClassNames: Record<InvocationLogStatus, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-orange-50 text-orange-700 border-orange-200',
  timeout: 'bg-red-50 text-red-700 border-red-200',
}

const methodClassNames: Record<InvocationLog['method'], string> = {
  GET: 'bg-blue-50 text-blue-700 border-blue-200',
  POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
  PATCH: 'bg-purple-50 text-purple-700 border-purple-200',
}

function InvocationLogStatusBadge({ status }: { status: InvocationLogStatus }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-semibold', statusClassNames[status])}>
      {statusLabels[status]}
    </Badge>
  )
}

function InvocationLogMethodBadge({ method }: { method: InvocationLog['method'] }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-semibold', methodClassNames[method])}>
      {method}
    </Badge>
  )
}

export function InvocationLogTable({
  logs = [],
  loading = false,
  showApiName = false,
}: InvocationLogTableProps) {
  const columnCount = showApiName ? 7 : 6

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[190px] whitespace-nowrap">调用时间</TableHead>
            <TableHead className="w-[120px]">请求方法</TableHead>
            {showApiName ? <TableHead>API 名称</TableHead> : null}
            <TableHead>请求路径</TableHead>
            <TableHead className="w-[100px]">状态码</TableHead>
            <TableHead className="w-[120px]">执行状态</TableHead>
            <TableHead className="w-[130px]">耗时（ms）</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[190px] whitespace-nowrap">调用时间</TableHead>
            <TableHead className="w-[120px]">请求方法</TableHead>
            {showApiName ? <TableHead>API 名称</TableHead> : null}
            <TableHead>请求路径</TableHead>
            <TableHead className="w-[100px]">状态码</TableHead>
            <TableHead className="w-[120px]">执行状态</TableHead>
            <TableHead className="w-[130px]">耗时（ms）</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap font-medium tabular-nums text-slate-700">
                {formatDateTime(log.invokedAt)}
              </TableCell>
              <TableCell>
                <InvocationLogMethodBadge method={log.method} />
              </TableCell>
              {showApiName ? <TableCell>{log.apiName ?? '-'}</TableCell> : null}
              <TableCell className="font-mono text-sm text-slate-700">{log.path}</TableCell>
              <TableCell
                className={cn(
                  'font-semibold tabular-nums',
                  log.statusCode >= 500 && 'text-red-600',
                  log.statusCode >= 400 && log.statusCode < 500 && 'text-orange-600',
                )}
              >
                {log.statusCode}
              </TableCell>
              <TableCell>
                <InvocationLogStatusBadge status={log.status} />
              </TableCell>
              <TableCell className={cn('font-semibold tabular-nums', log.durationMs >= 1000 && 'text-red-600')}>
                {log.durationMs}
              </TableCell>
            </TableRow>
          ))}
          {!logs.length ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-32 text-center text-slate-500">
                暂无调用日志
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}
