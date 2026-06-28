import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TaskListItem } from '@/modules/scheduled-task/components/task-workspace/task-list-item'
import type { ScheduledTask } from '@/shared/contracts/scheduled-task.contract'

type TaskSidebarProps = {
  tasks: ScheduledTask[]
  selectedTaskId?: string
  loading?: boolean
  onSelectTask: (taskId: string) => void
  onCreateTask: () => void
}

export function TaskSidebar({
  tasks,
  selectedTaskId,
  loading,
  onSelectTask,
  onCreateTask,
}: TaskSidebarProps) {
  const [keyword, setKeyword] = useState('')
  const filtered = useMemo(() => {
    const value = keyword.trim().toLowerCase()
    if (!value) {
      return tasks
    }
    return tasks.filter((task) => task.name.toLowerCase().includes(value))
  }, [tasks, keyword])

  return (
    <aside className="flex min-h-0 w-[clamp(260px,24vw,320px)] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="space-y-3 border-b border-slate-200 p-3">
        <Button className="w-full justify-start" onClick={onCreateTask}>
          <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
          新建任务
        </Button>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索任务名称"
            aria-label="搜索任务名称"
            autoComplete="off"
            className="pl-9"
          />
        </div>

      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
        {loading ? (
          <Card className="bg-white">
            <CardContent className="p-4 text-sm text-slate-500">加载任务中…</CardContent>
          </Card>
        ) : null}
        {!loading && filtered.length
          ? filtered.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              active={task.id === selectedTaskId}
              onSelect={() => onSelectTask(task.id)}
            />
          ))
          : null}
        {!loading && !filtered.length ? (
          <Card className="bg-white">
            <CardContent className="p-4 text-sm text-slate-500">暂无匹配任务</CardContent>
          </Card>
        ) : null}
      </div>
    </aside>
  )
}
