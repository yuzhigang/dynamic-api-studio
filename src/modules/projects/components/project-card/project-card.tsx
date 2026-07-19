import { Link } from '@tanstack/react-router'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { ProjectCardActions } from '@/modules/projects/components/project-card/project-card-actions'
import {
  getProjectColor,
  getProjectIcon,
} from '@/modules/projects/model/project-appearance'
import { formatProjectTime } from '@/modules/projects/utils/format-project-time'
import type { Project } from '@/shared/contracts/project.contract'

type ProjectCardProps = {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const Icon = getProjectIcon(project.icon)
  const color = getProjectColor(project.color)

  return (
    <Card className="relative bg-white transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-md">
      <Link
        to="/projects/$projectId"
        params={{ projectId: project.id }}
        className="block rounded-md p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`打开项目 ${project.name}`}
      >
        <div className="flex items-center gap-3 pr-8">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
              color.iconWrapClass,
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-slate-900">{project.name}</span>
              <Badge
                variant={project.status === 'active' ? 'success' : 'secondary'}
                className="shrink-0"
              >
                {project.status === 'active' ? '启用' : '已归档'}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {project.code} · {project.description || '暂无描述'}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
          <span>
            API <span className="font-semibold text-slate-700">{project.apiCount}</span>
          </span>
          <span className="truncate tabular-nums">更新于 {formatProjectTime(project.updatedAt)}</span>
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <ProjectCardActions project={project} />
      </div>
    </Card>
  )
}
