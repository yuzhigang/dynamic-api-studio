import { Link, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { AppPage } from '@/layouts/app-shell/app-page'
import { useApiDefinitionListQuery, useApiDefinitionQuery } from '@/modules/project-management/hooks/use-api-definition-query'
import { ProjectApiMainPanel } from '@/modules/project-management/components/project-workspace/project-api-main-panel'
import { ProjectApiSidebar } from '@/modules/project-management/components/project-workspace/project-api-sidebar'
import { useProjectQuery } from '@/modules/project-management/hooks/use-project-query'

type ProjectApiWorkspaceTab = 'basic' | 'variables' | 'history' | 'invocations'

function getActiveTab(pathname: string): ProjectApiWorkspaceTab {
  if (pathname.endsWith('/variables')) {
    return 'variables'
  }

  if (/\/tests(\/|$)/.test(pathname)) {
    return 'history'
  }

  if (pathname.endsWith('/invocations')) {
    return 'invocations'
  }

  return 'basic'
}

export function ProjectDetailPage() {
  const { projectId = '', apiId = '', testId } = useParams({ strict: false }) as {
    projectId?: string
    apiId?: string
    testId?: string
  }
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const projectQuery = useProjectQuery(projectId)
  const apiListQuery = useApiDefinitionListQuery(projectId)
  const apis = useMemo(() => apiListQuery.data ?? [], [apiListQuery.data])
  const selectedApiId = apiId || apis[0]?.id
  const selectedApi = apis.find((api) => api.id === selectedApiId)
  const apiDefinitionQuery = useApiDefinitionQuery(projectId, selectedApiId ?? '')
  const project = projectQuery.data
  const activeTab = getActiveTab(pathname)

  useEffect(() => {
    if (!apis.length) {
      return
    }

    const routeApiExists = apiId && apis.some((api) => api.id === apiId)

    if (!apiId || !routeApiExists) {
      navigate({
        to: '/projects/$projectId/apis/$apiId',
        params: { projectId, apiId: apis[0].id },
        replace: true,
      })
    }
  }, [apiId, apis, navigate, projectId])

  return (
    <AppPage>
      <div className="h-full min-h-0">
        {projectQuery.isLoading ? (
          <div className="p-5 text-sm text-slate-500">加载项目中…</div>
        ) : null}
        {!projectQuery.isLoading && !project ? (
          <div className="p-5">
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              项目不存在。
              <Button asChild variant="link" className="ml-1 px-1">
                <Link to="/projects">返回项目</Link>
              </Button>
            </div>
          </div>
        ) : null}
        {project ? (
          <div className="flex h-full min-h-0 bg-slate-50">
            <ResizablePanelGroup
              autoSaveId="project-api-workspace-layout"
              orientation="horizontal"
              className="h-full min-h-0 w-full"
            >
              <ResizablePanel id="sidebar" className="min-w-0" defaultSize="24%" minSize="16%" maxSize="42%">
                <ProjectApiSidebar
                  projectId={project.id}
                  apis={apis}
                  selectedApiId={selectedApiId}
                  archived={project.status === 'archived'}
                  loading={apiListQuery.isLoading}
                  onSelectApi={(nextApiId) =>
                    navigate({
                      to: '/projects/$projectId/apis/$apiId',
                      params: { projectId: project.id, apiId: nextApiId },
                    })
                  }
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id="main" className="min-w-0" defaultSize="76%" minSize="50%">
                <ProjectApiMainPanel
                  project={project}
                  selectedApi={selectedApi}
                  apiDefinition={apiDefinitionQuery.data}
                  loading={Boolean(selectedApiId && apiDefinitionQuery.isLoading)}
                  activeTab={activeTab}
                  testId={testId}
                  onOpenTest={(nextTestId) => {
                    if (!selectedApiId) {
                      return
                    }

                    navigate({
                      to: '/projects/$projectId/apis/$apiId/tests/$testId',
                      params: { projectId: project.id, apiId: selectedApiId, testId: nextTestId },
                    })
                  }}
                  onShowTestList={() => {
                    if (!selectedApiId) {
                      return
                    }

                    navigate({
                      to: '/projects/$projectId/apis/$apiId/tests',
                      params: { projectId: project.id, apiId: selectedApiId },
                    })
                  }}
                  onTabChange={(nextTab) => {
                    if (!selectedApiId) {
                      return
                    }

                    if (nextTab === 'variables') {
                      navigate({
                        to: '/projects/$projectId/apis/$apiId/variables',
                        params: { projectId: project.id, apiId: selectedApiId },
                      })
                      return
                    }

                    if (nextTab === 'history') {
                      navigate({
                        to: '/projects/$projectId/apis/$apiId/tests',
                        params: { projectId: project.id, apiId: selectedApiId },
                      })
                      return
                    }

                    if (nextTab === 'invocations') {
                      navigate({
                        to: '/projects/$projectId/apis/$apiId/invocations',
                        params: { projectId: project.id, apiId: selectedApiId },
                      })
                      return
                    }

                    navigate({
                      to: '/projects/$projectId/apis/$apiId',
                      params: { projectId: project.id, apiId: selectedApiId },
                    })
                  }}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : null}
      </div>
    </AppPage>
  )
}
