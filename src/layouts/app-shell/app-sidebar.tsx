import { Hexagon } from 'lucide-react'

import { navItems } from '@/layouts/app-shell/nav-config'
import { SidebarNavItem } from '@/layouts/app-shell/sidebar-nav-item'
import { SidebarUserMenu } from '@/layouts/app-shell/sidebar-user-menu'

export function AppSidebar() {
  return (
    <aside className="flex h-dvh min-h-0 w-[176px] shrink-0 flex-col bg-[#052e5d] text-white">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-cyan-400/90 text-[#052e5d]">
          <Hexagon aria-hidden="true" className="h-4 w-4 fill-current" />
        </div>
        <span className="text-base font-semibold tracking-wide">API 设计器</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {navItems.map((item) => (
          <SidebarNavItem key={item.label} item={item} />
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <SidebarUserMenu name="admin" avatarFallback="A" />
      </div>
    </aside>
  )
}
