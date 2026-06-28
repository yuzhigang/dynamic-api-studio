import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { ProjectFormDialog } from '@/modules/project-management/components/project-form/project-form-dialog'
import { ProjectCardGrid } from '@/modules/project-management/components/project-card/project-card-grid'
import type { Project } from '@/shared/contracts/project.contract'

type RecentProjectsSectionProps = {
  projects: Project[]
  loading?: boolean
}

export function RecentProjectsSection({ projects, loading }: RecentProjectsSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">最近项目</h2>
          <p className="text-sm text-slate-500">最近更新的 10 个项目。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/projects">查看全部</Link>
          </Button>
          <ProjectFormDialog mode="create" />
        </div>
      </div>
      <ProjectCardGrid projects={projects} loading={loading} limit={10} />
    </section>
  )
}
