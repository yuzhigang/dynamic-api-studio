import { Badge } from '@/components/ui/badge'
import type { VariableKind } from '@/shared/contracts/variable.contract'

const KIND_LABELS: Record<VariableKind, string> = {
  single: '单值',
  list: '枚举值',
}

export function VariableKindBadge({ kind }: { kind: VariableKind }) {
  return <Badge variant={kind === 'list' ? 'secondary' : 'outline'}>{KIND_LABELS[kind]}</Badge>
}
