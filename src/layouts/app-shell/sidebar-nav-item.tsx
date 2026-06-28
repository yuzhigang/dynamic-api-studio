import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'

import type { NavItem } from '@/layouts/app-shell/nav-config'
import { cn } from '@/lib/cn'

type SidebarNavItemProps = {
  item: NavItem
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const Icon = item.icon

  if (item.children?.length) {
    return (
      <div>
        <div className="flex items-center justify-between rounded-md bg-white/10 px-3 py-2 text-sm font-semibold">
          <span className="flex min-w-0 items-center gap-2">
            <Icon aria-hidden="true" className="h-4 w-4 text-cyan-300" />
            <span className="truncate">{item.label}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-white/70" />
        </div>
        <div className="mt-1 space-y-1 pl-7">
          {item.children.map((child) => (
            <Link
              key={child.to}
              to={child.to}
              activeOptions={{ exact: true }}
              className="block rounded-md px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              activeProps={{
                className: 'bg-[#1d63b7] font-semibold text-white',
              }}
            >
              {child.label}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Link
      to={item.to ?? '/api-management/create'}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/82 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
      )}
      activeProps={{ className: 'bg-white/10 text-white' }}
    >
      <Icon aria-hidden="true" className="h-4 w-4 text-white/85" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
