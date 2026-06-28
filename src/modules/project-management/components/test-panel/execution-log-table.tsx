import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'

export function ExecutionLogTable() {
  const { state } = useApiDesigner()
  const logs = state.testResult?.logs ?? []

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">执行日志</h3>
      <div className="rounded-md border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[72px]">时间</TableHead>
              <TableHead>步骤</TableHead>
              <TableHead className="w-[62px]">状态</TableHead>
              <TableHead className="w-[62px] text-right">耗时</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={`${log.time}-${log.step}`}>
                <TableCell>{log.time}</TableCell>
                <TableCell>{log.step}</TableCell>
                <TableCell>
                  <Badge variant={log.status === 'success' ? 'success' : 'destructive'}>
                    {log.status === 'success' ? '成功' : '失败'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{log.durationMs}ms</TableCell>
              </TableRow>
            ))}
            {!logs.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500">
                  暂无执行日志
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
