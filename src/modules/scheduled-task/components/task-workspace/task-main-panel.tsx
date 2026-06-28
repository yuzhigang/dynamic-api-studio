import { Play, Power } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskRunLogTab } from '@/modules/scheduled-task/components/task-workspace/task-run-log-tab'
import { TaskSettingsTab } from '@/modules/scheduled-task/components/task-workspace/task-settings-tab'
import { useRunTask } from '@/modules/scheduled-task/hooks/use-run-task'
import { useSaveTask } from '@/modules/scheduled-task/hooks/use-save-task'
import { cn } from '@/lib/cn'
import type { ScheduledTask } from '@/shared/contracts/scheduled-task.contract'

export type TaskWorkspaceTab = 'settings' | 'logs'

const tabTriggerClass =
  'h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'

type TaskMainPanelProps = {
  task: ScheduledTask
  activeTab: TaskWorkspaceTab
  onTabChange: (tab: TaskWorkspaceTab) => void
}

export function TaskMainPanel({ task, activeTab, onTabChange }: TaskMainPanelProps) {
  const saveTask = useSaveTask()
  const runTask = useRunTask(task.id)

  const toggleEnabled = () => {
    saveTask.mutate({
      id: task.id,
      name: task.name,
      description: task.description ?? '',
      enabled: !task.enabled,
      dataSourceId: task.dataSourceId,
      sql: task.sql,
      trigger: task.trigger,
    })
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900">{task.name}</h1>
          {task.description ? (
            <p className="truncate text-sm text-slate-500">{task.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={saveTask.isPending}
            onClick={toggleEnabled}
            className={cn(task.enabled ? 'text-emerald-700' : 'text-slate-500')}
          >
            <Power aria-hidden="true" className="mr-1.5 h-4 w-4" />
            {task.enabled ? '已启用' : '已停用'}
          </Button>
          <Button size="sm" disabled={runTask.isPending} onClick={() => runTask.mutate()}>
            <Play aria-hidden="true" className="mr-1.5 h-4 w-4" />
            {runTask.isPending ? '运行中…' : '立即运行'}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as TaskWorkspaceTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-slate-200 px-5 pt-3">
          <TabsList className="h-9 bg-transparent p-0">
            <TabsTrigger value="settings" className={tabTriggerClass}>
              设置
            </TabsTrigger>
            <TabsTrigger value="logs" className={tabTriggerClass}>
              运行日志
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="settings" className="m-0 min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
          <TaskSettingsTab key={task.id} task={task} />
        </TabsContent>

        <TabsContent value="logs" className="m-0 min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
          {activeTab === 'logs' ? <TaskRunLogTab taskId={task.id} /> : null}
        </TabsContent>
      </Tabs>
    </section>
  )
}
