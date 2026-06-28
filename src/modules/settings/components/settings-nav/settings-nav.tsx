import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/cn'
import { settingsNavItems } from '@/modules/settings/components/settings-nav/settings-nav-config'

export function SettingsNav() {
  return (
    <aside className="flex min-h-0 w-[clamp(200px,18vw,260px)] shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-2">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        系统设置
      </p>
      <nav className="space-y-1">
        {settingsNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'block rounded-md px-3 py-2 text-sm transition-colors',
              'text-slate-600 hover:bg-white hover:text-slate-900',
            )}
            activeProps={{ className: 'bg-white font-medium text-slate-900 shadow-sm' }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
