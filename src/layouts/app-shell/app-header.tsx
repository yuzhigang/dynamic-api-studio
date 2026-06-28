import { Link, useParams, useRouterState } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import type { ReactNode } from 'react'

import { AppBreadcrumb } from '@/layouts/app-shell/app-breadcrumb'
import { AppHeaderSlotTarget } from '@/layouts/app-shell/app-header-actions'
import { useApiDefinitionListQuery } from '@/modules/project-management/hooks/use-api-definition-query'
import { useProjectQuery } from '@/modules/project-management/hooks/use-project-query'

type BreadcrumbContext = {
  projectId?: string
  projectName?: string
  firstApiName?: string
}

function ProjectNameBreadcrumb({
  projectId,
  projectName,
}: {
  projectId: string
  projectName?: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{projectName ?? '项目详情'}</span>
      <Link
        to="/projects/$projectId/settings"
        params={{ projectId }}
        className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="项目设置"
      >
        <Settings aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </span>
  )
}

function getBreadcrumbItems(pathname: string, context: BreadcrumbContext): ReactNode[] {
  if (pathname.startsWith('/projects')) {
    const projectLink = (
      <Link
        to="/projects"
        className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        项目
      </Link>
    )

    if (pathname.includes('/apis/') && pathname.endsWith('/edit')) {
      return [projectLink, '编辑 API']
    }

    if (pathname.includes('/apis/create')) {
      return [projectLink, '创建 API']
    }

    if (context.projectId && pathname.endsWith('/settings')) {
      return [
        projectLink,
        <ProjectNameBreadcrumb
          projectId={context.projectId}
          projectName={context.projectName}
        />,
        '项目设置',
      ]
    }

    if (context.projectId && pathname !== '/projects') {
      return [
        projectLink,
        <ProjectNameBreadcrumb
          projectId={context.projectId}
          projectName={context.projectName}
        />,
        context.firstApiName ?? '暂无 API',
      ]
    }

    return [projectLink]
  }

  return ['首页']
}

export function AppHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { projectId = '', apiId = '' } = useParams({ strict: false }) as {
    projectId?: string
    apiId?: string
  }
  const projectQuery = useProjectQuery(projectId)
  const apiListQuery = useApiDefinitionListQuery(projectId)
  const selectedApiName =
    apiListQuery.data?.find((api) => api.id === apiId)?.name ?? apiListQuery.data?.[0]?.name

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5">
      <AppBreadcrumb
        items={getBreadcrumbItems(pathname, {
          projectId,
          projectName: projectQuery.data?.name,
          firstApiName: selectedApiName,
        })}
      />
      <AppHeaderSlotTarget className="flex shrink-0 items-center gap-2" />
    </header>
  )
}
