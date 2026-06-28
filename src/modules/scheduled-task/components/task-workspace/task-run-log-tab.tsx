import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { useTaskLogsQuery } from '@/modules/scheduled-task/hooks/use-task-logs-query'
import { formatDateTime } from '@/modules/invocation-log/utils/format-date-time'
import type { TaskRunStatus } from '@/shared/contracts/scheduled-task.contract'

const statusLabels: Record<TaskRunStatus, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
}

const statusClassNames: Record<TaskRunStatus, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
}

type TaskRunLogTabProps = {
  taskId: string
}

const pageSize = 10

export function TaskRunLogTab({ taskId }: TaskRunLogTabProps) {
  const [page, setPage] = useState(1)
  const query = useTaskLogsQuery(taskId, page, pageSize)

  // 切换任务时回到第一页
  useEffect(() => {
    setPage(1)
  }, [taskId])

  const logs = query.data?.items ?? []

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[190px]">开始时间</TableHead>
              <TableHead className="w-[110px]">触发方式</TableHead>
              <TableHead className="w-[110px]">状态</TableHead>
              <TableHead className="w-[120px]">耗时（ms）</TableHead>
              <TableHead className="w-[110px]">影响行数</TableHead>
              <TableHead>错误信息</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                  加载运行日志中…
                </TableCell>
              </TableRow>
            ) : null}
            {!query.isLoading &&
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-slate-700">
                    {formatDateTime(log.startedAt)}
                  </TableCell>
                  <TableCell>{log.trigger === 'manual' ? '手动' : '自动'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-semibold', statusClassNames[log.status])}
                    >
                      {statusLabels[log.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('font-semibold', log.durationMs >= 1000 && 'text-red-600')}>
                    {log.durationMs}
                  </TableCell>
                  <TableCell>{log.affectedRows ?? '-'}</TableCell>
                  <TableCell className="font-mono text-xs text-red-600">{log.error ?? '-'}</TableCell>
                </TableRow>
              ))}
            {!query.isLoading && !logs.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                  暂无运行日志
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {query.data && query.data.total > pageSize ? (
        <Pagination
          page={query.data.page}
          pageSize={pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}
