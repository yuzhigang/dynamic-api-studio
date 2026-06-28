import {
  AlarmClock,
  Database,
  FileSearch,
  Home,
  FolderKanban,
  Settings2,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type NavItem = {
  label: string
  to?: string
  icon: ComponentType<{ className?: string }>
  children?: Array<{
    label: string
    to: string
  }>
}

export const navItems: NavItem[] = [
  {
    label: '首页',
    to: '/home',
    icon: Home,
  },
  {
    label: '项目管理',
    to: '/projects',
    icon: FolderKanban,
  },
  {
    label: '定时任务',
    to: '/tasks',
    icon: AlarmClock,
  },
  {
    label: '数据源管理',
    to: '/datasources',
    icon: Database,
  },
  {
    label: '调用日志',
    to: '/invocation-logs',
    icon: FileSearch,
  },
  {
    label: '系统设置',
    to: '/settings',
    icon: Settings2,
  },
]
