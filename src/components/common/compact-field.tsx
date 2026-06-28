import type { PropsWithChildren, ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { RequiredMark } from '@/components/common/required-mark'

type CompactFieldProps = PropsWithChildren<{
  htmlFor: string
  label: ReactNode
  required?: boolean
}>

export function CompactField({ htmlFor, label, required, children }: CompactFieldProps) {
  return (
    <div className="grid grid-cols-[86px_minmax(0,1fr)] items-start gap-3 text-sm">
      <Label htmlFor={htmlFor} className="pt-1.5 text-xs font-medium text-slate-700">
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      <div>{children}</div>
    </div>
  )
}
