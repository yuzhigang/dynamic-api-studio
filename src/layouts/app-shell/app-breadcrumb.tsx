import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

type AppBreadcrumbProps = {
  items: ReactNode[]
}

export function AppBreadcrumb({ items }: AppBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const current = index === items.length - 1

        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : null}
            <span className={current ? 'font-semibold text-slate-950' : undefined}>
              {item}
            </span>
          </span>
        )
      })}
    </nav>
  )
}
