import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { SqlEditor } from '@/components/editors/sql-editor'
import { TaskTriggerFields } from '@/modules/scheduled-task/components/task-workspace/task-trigger-fields'
import { useDataSourcesQuery } from '@/modules/scheduled-task/hooks/use-data-sources-query'
import { useSaveTask } from '@/modules/scheduled-task/hooks/use-save-task'
import { isValidCron } from '@/modules/scheduled-task/utils/describe-trigger'
import type { ScheduledTask, ScheduledTaskDraft } from '@/shared/contracts/scheduled-task.contract'

type TaskSettingsTabProps = {
  task: ScheduledTask
}

function toDraft(task: ScheduledTask): ScheduledTaskDraft {
  return {
    id: task.id,
    name: task.name,
    description: task.description ?? '',
    enabled: task.enabled,
    dataSourceId: task.dataSourceId,
    sql: task.sql,
    trigger: task.trigger,
  }
}

export function TaskSettingsTab({ task }: TaskSettingsTabProps) {
  // 草稿仅在挂载时由 task 初始化；切换任务时由父组件 key={task.id} 触发重挂载，
  // 因此不依赖 useEffect 监听 task，避免后台 refetch 返回新引用时覆盖未保存的编辑。
  const [draft, setDraft] = useState<ScheduledTaskDraft>(() => toDraft(task))
  const dataSourcesQuery = useDataSourcesQuery()
  const saveTask = useSaveTask()

  const cronInvalid = draft.trigger.mode === 'cron' && !isValidCron(draft.trigger.expression)
  const canSave = draft.name.trim().length > 0 && draft.dataSourceId.length > 0 && !cronInvalid

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-base">任务设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-1.5">
          <Label htmlFor="task-name">名称</Label>
          <Input
            id="task-name"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="task-desc">描述</Label>
          <Textarea
            id="task-desc"
            rows={2}
            value={draft.description ?? ''}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </div>

        <Separator />

        <div className="grid gap-1.5">
          <Label>数据源</Label>
          <Select
            value={draft.dataSourceId || undefined}
            onValueChange={(dataSourceId) => setDraft({ ...draft, dataSourceId })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择数据源" />
            </SelectTrigger>
            <SelectContent>
              {(dataSourcesQuery.data ?? []).map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>SQL</Label>
          <div className="overflow-hidden rounded-md border border-input">
            <SqlEditor value={draft.sql} autoHeight onChange={(sql) => setDraft({ ...draft, sql })} />
          </div>
        </div>

        <Separator />

        <div className="grid gap-1.5">
          <Label>触发方式</Label>
          <TaskTriggerFields
            value={draft.trigger}
            onChange={(trigger) => setDraft({ ...draft, trigger })}
          />
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          <Button disabled={!canSave || saveTask.isPending} onClick={() => saveTask.mutate(draft)}>
            {saveTask.isPending ? '保存中…' : '保存'}
          </Button>
          {saveTask.isSuccess ? <span className="text-sm text-emerald-600">已保存</span> : null}
          {saveTask.isError ? <span className="text-sm text-red-600">保存失败</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
