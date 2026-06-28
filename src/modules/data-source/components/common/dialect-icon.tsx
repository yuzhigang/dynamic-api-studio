import { Cylinder, Database, DatabaseZap, Server, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/cn'
import type { Dialect } from '@/shared/contracts/data-source.contract'

type DialectIconConfig = {
  icon: LucideIcon
  /** 品牌主色，用于色彩区分不同数据库类型 */
  color: string
}

const dialectIconMap: Record<Dialect, DialectIconConfig> = {
  postgresql: { icon: Database, color: '#336791' },
  mysql: { icon: Cylinder, color: '#00758F' },
  oracle: { icon: Database, color: '#C74634' },
  sqlserver: { icon: Server, color: '#A91D22' },
  tdengine: { icon: DatabaseZap, color: '#E6352F' },
}

type DialectIconProps = {
  dialect: Dialect
  className?: string
}

export function DialectIcon({ dialect, className }: DialectIconProps) {
  const { icon: Icon, color } = dialectIconMap[dialect]

  return <Icon aria-hidden="true" className={cn('h-4 w-4 shrink-0', className)} style={{ color }} />
}
