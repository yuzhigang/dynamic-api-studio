import { Outlet } from '@tanstack/react-router'

import { AppShell } from '@/layouts/app-shell/app-shell'

export function AppRouteComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
