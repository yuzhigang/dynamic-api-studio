import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { describeTrigger, isValidCron } from '@/modules/scheduled-task/utils/describe-trigger'
import type { Trigger } from '@/shared/contracts/scheduled-task.contract'

type TaskTriggerFieldsProps = {
  value: Trigger
  onChange: (trigger: Trigger) => void
}

const intervalUnits: Array<{ value: 'minute' | 'hour' | 'day'; label: string }> = [
  { value: 'minute', label: '分钟' },
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
]

export function TaskTriggerFields({ value, onChange }: TaskTriggerFieldsProps) {
  const cronInvalid = value.mode === 'cron' && !isValidCron(value.expression)

  return (
    <div className="space-y-3">
      <RadioGroup
        className="flex gap-6"
        value={value.mode}
        onValueChange={(mode) =>
          onChange(
            mode === 'cron'
              ? { mode: 'cron', expression: '0 2 * * *' }
              : { mode: 'interval', every: 5, unit: 'minute' },
          )
        }
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="interval" id="trigger-interval" />
          <Label htmlFor="trigger-interval">固定间隔</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="cron" id="trigger-cron" />
          <Label htmlFor="trigger-cron">Cron 表达式</Label>
        </div>
      </RadioGroup>

      {value.mode === 'interval' ? (
        <div className="flex items-end gap-2">
          <div className="flex w-28 flex-col gap-1.5">
            <Label htmlFor="trigger-every">间隔</Label>
            <Input
              id="trigger-every"
              inputMode="numeric"
              value={String(value.every)}
              onChange={(event) =>
                onChange({
                  ...value,
                  every: Math.max(1, Number(event.target.value.replace(/[^0-9]/g, '')) || 1),
                })
              }
            />
          </div>
          <div className="flex w-32 flex-col gap-1.5">
            <Label>单位</Label>
            <Select
              value={value.unit}
              onValueChange={(unit) => onChange({ ...value, unit: unit as typeof value.unit })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {intervalUnits.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trigger-expression">Cron 表达式</Label>
          <Input
            id="trigger-expression"
            value={value.expression}
            placeholder="分 时 日 月 周，如 0 2 * * *"
            onChange={(event) => onChange({ mode: 'cron', expression: event.target.value })}
          />
          {cronInvalid ? (
            <span className="text-xs text-red-600">Cron 表达式需为 5 段（分 时 日 月 周）</span>
          ) : null}
        </div>
      )}

      <p className="text-xs text-slate-500">调度预览：{describeTrigger(value)}</p>
    </div>
  )
}
