import { Badge } from '@/components/ui/badge'
import type { ProjectStatus } from '@/shared/contracts/project.contract'

type ProjectStatusBadgeProps = {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <Badge variant={status === 'active' ? 'success' : 'secondary'}>
      {status === 'active' ? '启用' : '已归档'}
    </Badge>
  )
}
