import { Outlet } from '@tanstack/react-router'

import { SettingsNav } from '@/modules/settings/components/settings-nav/settings-nav'

export function SettingsPage() {
  return (
    <div className="flex h-full min-h-0">
      <SettingsNav />
      <div className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
