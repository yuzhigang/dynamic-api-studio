import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function NativeSelect({ className, children, ...props }: NativeSelectProps) {
  return (
    <select
      className={cn(
        'flex h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
