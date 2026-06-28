import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { AppPage } from '@/layouts/app-shell/app-page'
import { useApiDefinitionListQuery } from '@/modules/project-management/hooks/use-api-definition-query'
import { ProjectApiSidebar } from '@/modules/project-management/components/project-workspace/project-api-sidebar'
import { ProjectSettingsForm } from '@/modules/project-management/components/project-form/project-settings-form'
import { useProjectQuery } from '@/modules/project-management/hooks/use-project-query'

export function ProjectSettingsPage() {
  const { projectId = '' } = useParams({ strict: false }) as { projectId?: string }
  const navigate = useNavigate()
  const query = useProjectQuery(projectId)
  const apiListQuery = useApiDefinitionListQuery(projectId)
  const apis = useMemo(() => apiListQuery.data ?? [], [apiListQuery.data])
  const project = query.data

  return (
    <AppPage>
      <div className="h-full min-h-0">
        {query.isLoading ? (
          <div className="p-5 text-sm text-slate-500">加载项目设置中…</div>
        ) : null}
        {!query.isLoading && !project ? (
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
              autoSaveId="project-settings-layout"
              orientation="horizontal"
              className="h-full min-h-0 w-full"
            >
              <ResizablePanel id="sidebar" className="min-w-0" defaultSize="24%" minSize="16%" maxSize="42%">
                <ProjectApiSidebar
                  projectId={project.id}
                  apis={apis}
                  archived={project.status === 'archived'}
                  loading={apiListQuery.isLoading}
                  onSelectApi={(apiId) =>
                    navigate({
                      to: '/projects/$projectId/apis/$apiId',
                      params: { projectId: project.id, apiId },
                    })
                  }
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id="content" className="min-w-0">
                <div className="h-full overflow-auto p-5">
                  <div className="max-w-2xl space-y-4">
                    <Card className="bg-white">
                      <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">项目设置</CardTitle>
                        <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
                          {project.status === 'active' ? '启用' : '已归档'}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <ProjectSettingsForm key={project.id} project={project} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : null}
      </div>
    </AppPage>
  )
}
