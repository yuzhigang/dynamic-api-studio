import { Badge } from '@/components/ui/badge'
import { DialectIcon } from '@/modules/data-source/components/common/dialect-icon'
import { dialectLabel } from '@/modules/data-source/model/dialect'
import type { Dialect } from '@/shared/contracts/data-source.contract'

type DialectBadgeProps = {
  dialect: Dialect
}

export function DialectBadge({ dialect }: DialectBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-slate-300 bg-white text-[11px] font-medium text-slate-600"
    >
      <DialectIcon dialect={dialect} className="h-3 w-3" />
      {dialectLabel(dialect)}
    </Badge>
  )
}
