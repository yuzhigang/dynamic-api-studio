import {
  BarChart3,
  Bell,
  Boxes,
  Cloud,
  CreditCard,
  Database,
  FileText,
  Globe,
  KeyRound,
  Layers,
  Package,
  Settings2,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

/** 项目可选图标（预选 Lucide 图标集）。存储为图标名字符串。 */
export const projectIconOptions: Array<{ name: string; Icon: LucideIcon }> = [
  { name: 'Boxes', Icon: Boxes },
  { name: 'ShoppingCart', Icon: ShoppingCart },
  { name: 'Users', Icon: Users },
  { name: 'Database', Icon: Database },
  { name: 'CreditCard', Icon: CreditCard },
  { name: 'BarChart3', Icon: BarChart3 },
  { name: 'FileText', Icon: FileText },
  { name: 'Package', Icon: Package },
  { name: 'Truck', Icon: Truck },
  { name: 'Warehouse', Icon: Warehouse },
  { name: 'Globe', Icon: Globe },
  { name: 'Layers', Icon: Layers },
  { name: 'Workflow', Icon: Workflow },
  { name: 'KeyRound', Icon: KeyRound },
  { name: 'Bell', Icon: Bell },
  { name: 'Cloud', Icon: Cloud },
  { name: 'Settings2', Icon: Settings2 },
]

export const DEFAULT_PROJECT_ICON = 'Boxes'

const iconByName = new Map(projectIconOptions.map((option) => [option.name, option.Icon]))

/** 按名称取图标组件，未知或缺省时回退到默认图标。 */
export function getProjectIcon(name?: string): LucideIcon {
  return (name && iconByName.get(name)) || Boxes
}

export type ProjectColorOption = {
  /** 存储用的颜色 token。 */
  token: string
  label: string
  /** 选色器圆点底色。 */
  swatchClass: string
  /** 卡片图标容器底色 + 图标色。 */
  iconWrapClass: string
}

/** 项目可选颜色（预设色板）。存储为 token 字符串。 */
export const projectColorOptions: ProjectColorOption[] = [
  { token: 'slate', label: '石板灰', swatchClass: 'bg-slate-500', iconWrapClass: 'bg-slate-100 text-slate-600' },
  { token: 'blue', label: '蓝', swatchClass: 'bg-blue-500', iconWrapClass: 'bg-blue-50 text-blue-600' },
  { token: 'emerald', label: '翠绿', swatchClass: 'bg-emerald-500', iconWrapClass: 'bg-emerald-50 text-emerald-600' },
  { token: 'amber', label: '琥珀', swatchClass: 'bg-amber-500', iconWrapClass: 'bg-amber-50 text-amber-600' },
  { token: 'violet', label: '紫', swatchClass: 'bg-violet-500', iconWrapClass: 'bg-violet-50 text-violet-600' },
  { token: 'rose', label: '玫红', swatchClass: 'bg-rose-500', iconWrapClass: 'bg-rose-50 text-rose-600' },
  { token: 'cyan', label: '青', swatchClass: 'bg-cyan-500', iconWrapClass: 'bg-cyan-50 text-cyan-600' },
  { token: 'orange', label: '橙', swatchClass: 'bg-orange-500', iconWrapClass: 'bg-orange-50 text-orange-600' },
]

export const DEFAULT_PROJECT_COLOR = 'slate'

const colorByToken = new Map(projectColorOptions.map((option) => [option.token, option]))

/** 按 token 取颜色配置，未知或缺省时回退到默认颜色。 */
export function getProjectColor(token?: string): ProjectColorOption {
  return (token && colorByToken.get(token)) || projectColorOptions[0]
}
