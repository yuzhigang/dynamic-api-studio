import type { Variable } from '@/shared/contracts/variable.contract'

export function VariableValueDisplay({ variable }: { variable: Variable }) {
  if (variable.kind === 'single') {
    return <span className="font-mono text-sm text-slate-700">{variable.value || '—'}</span>
  }

  if (variable.items.length === 0) {
    return <span className="text-sm text-slate-400">—</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {variable.items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  )
}
