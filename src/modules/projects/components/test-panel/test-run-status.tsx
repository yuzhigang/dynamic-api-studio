import { CircleCheck, Loader2 } from 'lucide-react'

type TestRunStatusProps = {
  pending: boolean
  success: boolean
  durationMs?: number
  stepCount: number
}

export function TestRunStatus({ pending, success, durationMs, stepCount }: TestRunStatusProps) {
  return (
    <div
      className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-600"
      aria-live="polite"
    >
      <div className="flex items-center gap-5">
        <span>总耗时：{durationMs ?? 0}ms</span>
        <span>请求步骤：{stepCount}</span>
      </div>
      <div className="flex items-center gap-1.5 font-medium text-emerald-600">
        {pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
        {!pending && success ? <CircleCheck aria-hidden="true" className="h-4 w-4" /> : null}
        {pending ? '执行中…' : success ? '执行成功' : '等待执行'}
      </div>
    </div>
  )
}
