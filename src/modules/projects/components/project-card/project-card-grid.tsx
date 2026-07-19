import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectCard } from '@/modules/projects/components/project-card/project-card'
import type { Project } from '@/shared/contracts/project.contract'

type ProjectCardGridProps = {
  projects: Project[]
  loading?: boolean
  limit?: number
}

export function ProjectCardGrid({ projects, loading, limit }: ProjectCardGridProps) {
  const visibleProjects = typeof limit === 'number' ? projects.slice(0, limit) : projects

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="bg-white">
            <CardHeader className="items-start pb-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-8 w-8" />
            </CardHeader>
            <CardContent className="pt-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!visibleProjects.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        暂无项目
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {visibleProjects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
