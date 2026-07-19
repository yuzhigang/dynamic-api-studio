export type SettingsNavItem = {
  label: string
  to: string
}

export const settingsNavItems: SettingsNavItem[] = [
  { label: '基本设置', to: '/settings/general' },
  { label: '全局变量', to: '/settings/global-variables' },
  { label: '自定义函数', to: '/settings/custom-functions' },
]
