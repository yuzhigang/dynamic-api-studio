import type { PropsWithChildren } from 'react'

import { AppHeader } from '@/layouts/app-shell/app-header'
import { AppHeaderSlotProvider } from '@/layouts/app-shell/app-header-actions'
import { AppSidebar } from '@/layouts/app-shell/app-sidebar'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-slate-50 text-slate-950">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950 shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        跳转到主要内容
      </a>
      <AppSidebar />
      <AppHeaderSlotProvider>
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main id="main-content" className="min-h-0 flex-1 overflow-hidden" tabIndex={-1}>
            {children}
          </main>
        </div>
      </AppHeaderSlotProvider>
    </div>
  )
}
