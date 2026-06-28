import { History } from 'lucide-react'

import { cn } from '@/lib/cn'
import { describeTrigger } from '@/modules/scheduled-task/utils/describe-trigger'
import { formatLastRun } from '@/modules/scheduled-task/utils/format-last-run'
import type { ScheduledTask } from '@/shared/contracts/scheduled-task.contract'

type TaskListItemProps = {
  task: ScheduledTask
  active?: boolean
  onSelect: () => void
}

export function TaskListItem({ task, active, onSelect }: TaskListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-0.5 rounded-md border bg-white px-2.5 py-1.5 text-left transition-colors',
        active ? 'border-primary ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            task.enabled ? 'bg-emerald-500' : 'bg-slate-300',
          )}
        />
        <span className="truncate text-sm font-medium text-slate-800">{task.name}</span>
      </div>
      <div className="flex items-center justify-between gap-2 pl-4 text-xs text-slate-500">
        <span className="truncate">{describeTrigger(task.trigger)}</span>
        <span
          className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400"
          title={`最近运行：${formatLastRun(task.lastRunAt)}`}
        >
          <History aria-hidden="true" className="h-3 w-3" />
          {formatLastRun(task.lastRunAt)}
        </span>
      </div>
    </button>
  )
}
