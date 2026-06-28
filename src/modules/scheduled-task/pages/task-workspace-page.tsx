import { useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'

import { AppPage } from '@/layouts/app-shell/app-page'
import { TaskMainPanel } from '@/modules/scheduled-task/components/task-workspace/task-main-panel'
import type { TaskWorkspaceTab } from '@/modules/scheduled-task/components/task-workspace/task-main-panel'
import { TaskSidebar } from '@/modules/scheduled-task/components/task-workspace/task-sidebar'
import { useTaskListQuery } from '@/modules/scheduled-task/hooks/use-task-query'

function getActiveTab(pathname: string): TaskWorkspaceTab {
  return pathname.endsWith('/logs') ? 'logs' : 'settings'
}

export function TaskWorkspacePage() {
  const { taskId = '' } = useParams({ strict: false }) as { taskId?: string }
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const listQuery = useTaskListQuery()
  const tasks = useMemo(() => listQuery.data ?? [], [listQuery.data])
  const selectedTaskId = taskId || tasks[0]?.id
  const selectedTask = tasks.find((task) => task.id === selectedTaskId)
  const activeTab = getActiveTab(pathname)

  // 无 taskId 或指向不存在的任务时，重定向到第一个任务
  useEffect(() => {
    if (!tasks.length) {
      return
    }
    const routeTaskExists = taskId && tasks.some((task) => task.id === taskId)
    if (!taskId || !routeTaskExists) {
      navigate({ to: '/tasks/$taskId', params: { taskId: tasks[0].id }, replace: true })
    }
  }, [taskId, tasks, navigate])

  return (
    <AppPage>
      <div className="h-full min-h-0">
        {listQuery.isLoading ? (
          <div className="p-5 text-sm text-slate-500">加载任务中…</div>
        ) : null}
        {!listQuery.isLoading && !tasks.length ? (
          <div className="p-5">
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              暂无定时任务。点击左侧「新建任务」创建第一个任务。
            </div>
          </div>
        ) : null}
        {selectedTask ? (
          <div className="flex h-full min-h-0 bg-slate-50">
            <TaskSidebar
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              loading={listQuery.isLoading}
              onSelectTask={(nextId) =>
                navigate({ to: '/tasks/$taskId', params: { taskId: nextId } })
              }
              onCreateTask={() => navigate({ to: '/tasks/$taskId', params: { taskId: tasks[0].id } })}
            />
            <TaskMainPanel
              task={selectedTask}
              activeTab={activeTab}
              onTabChange={(tab) => {
                if (tab === 'logs') {
                  navigate({ to: '/tasks/$taskId/logs', params: { taskId: selectedTask.id } })
                } else {
                  navigate({ to: '/tasks/$taskId', params: { taskId: selectedTask.id } })
                }
              }}
            />
          </div>
        ) : null}
      </div>
    </AppPage>
  )
}
