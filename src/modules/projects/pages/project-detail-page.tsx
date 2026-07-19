import { useEffect, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useRouterState } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { AppPage } from '@/layouts/app-shell/app-page'
import { ProjectApiMainPanel } from '@/modules/projects/components/project-workspace/project-api-main-panel'
import { ProjectApiSidebar } from '@/modules/projects/components/project-workspace/project-api-sidebar'
import { useApiDefinitionListQuery, useApiDefinitionQuery } from '@/modules/projects/hooks/use-api-definition-query'
import { useProjectQuery } from '@/modules/projects/hooks/use-project-query'
import { apiDesignerQueryKeys } from '@/modules/projects/services/api-designer-query-keys'
import { createId } from '@/lib/id'
import {
  readApiDraft,
  writeApiDraft,
} from '@/modules/projects/utils/api-draft-storage'
import { createEmptyApiDefinition } from '@/shared/api-definition/create-empty-api-definition'
import type { ApiDefinitionDraft, ApiDefinitionSummary } from '@/shared/contracts/api-definition.contract'

type ProjectApiWorkspaceTab = 'basic' | 'history' | 'invocations'

function getActiveTab(pathname: string): ProjectApiWorkspaceTab {
  if (/\/tests(\/|$)/.test(pathname)) {
    return 'history'
  }

  if (pathname.endsWith('/invocations')) {
    return 'invocations'
  }

  return 'basic'
}

export function ProjectDetailPage() {
  const { projectId = '', apiId, testId } = useParams({ strict: false }) as {
    projectId?: string
    apiId?: string
    testId?: string
  }
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const projectQuery = useProjectQuery(projectId)
  const apiListQuery = useApiDefinitionListQuery(projectId)
  const apis = useMemo(() => apiListQuery.data ?? [], [apiListQuery.data])
  const [draftApi, setDraftApi] = useState<ApiDefinitionDraft | null>(() => readApiDraft(projectId))

  const isDraftApiId = (id: string) => id.startsWith('draft_')

  const createDraftApiDefinition = (overrides: { projectId: string; id: string }) =>
    createEmptyApiDefinition({
      ...overrides,
      name: '新建 API',
      path: '/',
      method: 'GET',
      tags: [],
      permissions: [],
      description: '',
      bodyContentType: 'json',
      requestParams: [],
      responseSchema: [],
      workflowSteps: [
        {
          id: createId('step'),
          kind: 'sql-query',
          title: '查询数据',
          outputVariable: 'result',
          multipleRows: true,
          sql: '',
        },
        {
          id: createId('step'),
          kind: 'js-transform',
          role: 'assemble',
          title: '结果组装',
          outputVariable: 'data',
          multipleRows: false,
          script: '',
        },
      ],
    })

  useEffect(() => {
    if (apiId && isDraftApiId(apiId) && !draftApi) {
      const stored = readApiDraft(projectId)
      if (stored) {
        if (stored.id !== apiId) {
          navigate({
            to: '/projects/$projectId/apis/$apiId',
            params: { projectId, apiId: stored.id! },
            replace: true,
          })
          return
        }
        setDraftApi(stored)
      } else {
        const created = createDraftApiDefinition({ projectId, id: apiId })
        setDraftApi(created)
        writeApiDraft(projectId, created)
      }
      return
    }

    if (!apiId || !isDraftApiId(apiId)) {
      setDraftApi(null)
    }
  }, [apiId, draftApi, navigate, projectId])

  const draftSummary: ApiDefinitionSummary | undefined = useMemo(() => {
    if (!draftApi) return undefined

    return {
      id: draftApi.id!,
      projectId: draftApi.projectId,
      name: draftApi.name,
      path: draftApi.path,
      method: draftApi.method,
      status: draftApi.status,
      updatedAt: new Date().toISOString(),
    }
  }, [draftApi])

  const apisWithDraft = useMemo(() => {
    if (!draftSummary) return apis
    return [draftSummary, ...apis]
  }, [apis, draftSummary])

  const selectedApiId = apiId || apisWithDraft[0]?.id
  const selectedApi = apisWithDraft.find((api) => api.id === selectedApiId)
  const apiDefinitionQuery = useApiDefinitionQuery(
    projectId,
    isDraftApiId(selectedApiId ?? '') ? '' : (selectedApiId ?? ''),
  )
  const project = projectQuery.data
  const activeTab = getActiveTab(pathname)

  useEffect(() => {
    if (!apisWithDraft.length) {
      return
    }

    const routeApiExists =
      apiId && (isDraftApiId(apiId) || apisWithDraft.some((api) => api.id === apiId))

    if (!apiId || !routeApiExists) {
      navigate({
        to: '/projects/$projectId/apis/$apiId',
        params: { projectId, apiId: apisWithDraft[0].id },
        replace: true,
      })
    }
  }, [apiId, apisWithDraft, navigate, projectId])

  const handleApiDefinitionChange = (definition: ApiDefinitionDraft) => {
    if (isDraftApiId(definition.id ?? '')) {
      setDraftApi(definition)
      writeApiDraft(projectId, definition)
      return
    }

    if (!definition.id || !projectId) {
      return
    }

    queryClient.setQueryData<ApiDefinitionDraft>(
      apiDesignerQueryKeys.apiDefinition(projectId, definition.id),
      definition,
    )

    queryClient.setQueryData<ApiDefinitionSummary[]>(
      apiDesignerQueryKeys.apiDefinitions(projectId),
      (prev) => {
        if (!prev) {
          return prev
        }

        return prev.map((api) =>
          api.id === definition.id
            ? {
                ...api,
                name: definition.name,
                path: definition.path,
                method: definition.method,
                status: definition.status,
              }
            : api,
        )
      },
    )
  }

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
                  apis={apisWithDraft}
                  selectedApiId={selectedApiId}
                  archived={project.status === 'archived'}
                  loading={apiListQuery.isLoading}
                  onSelectApi={(nextApiId) =>
                    navigate({
                      to: '/projects/$projectId/apis/$apiId',
                      params: { projectId: project.id, apiId: nextApiId },
                    })
                  }
                  onCreateApi={() => {
                    const stored = readApiDraft(project.id)
                    const draftApiId = stored?.id ?? createId('draft')
                    const definition = stored ?? createDraftApiDefinition({ projectId: project.id, id: draftApiId })
                    setDraftApi(definition)
                    if (!stored) {
                      writeApiDraft(project.id, definition)
                    }
                    navigate({
                      to: '/projects/$projectId/apis/$apiId',
                      params: { projectId: project.id, apiId: draftApiId },
                    })
                  }}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id="main" className="min-w-0" defaultSize="76%" minSize="50%">
                <ProjectApiMainPanel
                  project={project}
                  selectedApi={selectedApi}
                  apiDefinition={apiDefinitionQuery.data}
                  draftDefinition={draftApi ?? undefined}
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
                  onApiDefinitionChange={handleApiDefinitionChange}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : null}
      </div>
    </AppPage>
  )
}
