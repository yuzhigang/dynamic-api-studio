import { useEffect, useRef, useState } from 'react'

import { FilePlus2, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiDesignerToolbar } from '@/modules/projects/components/designer/api-designer-toolbar'
import { LeftDesignPanel } from '@/modules/projects/components/designer/left-design-panel'
import { WorkflowPanel } from '@/modules/projects/components/designer/workflow-panel'
import { ProjectApiInvocationLogTab } from '@/modules/projects/components/project-workspace/project-api-invocation-log-tab'
import { ProjectApiNewTestDialog } from '@/modules/projects/components/project-workspace/project-api-new-test-dialog'
import { ProjectApiTestHistoryTab } from '@/modules/projects/components/project-workspace/project-api-test-history-tab'
import { getNextTestName, toTestId } from '@/modules/projects/components/project-workspace/history-utils'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'
import { ApiDesignerProvider } from '@/modules/projects/state/api-designer-context'
import type {
  ApiDefinitionDraft,
  ApiDefinitionSummary,
} from '@/shared/contracts/api-definition.contract'
import type { Project } from '@/shared/contracts/project.contract'

export type ProjectApiWorkspaceTab = 'basic' | 'history' | 'invocations'

type ProjectApiMainPanelProps = {
  project: Project
  selectedApi?: ApiDefinitionSummary
  apiDefinition?: ApiDefinitionDraft
  draftDefinition?: ApiDefinitionDraft
  loading?: boolean
  activeTab?: ProjectApiWorkspaceTab
  testId?: string
  onTabChange?: (tab: ProjectApiWorkspaceTab) => void
  onOpenTest?: (testId: string) => void
  onShowTestList?: () => void
  onCreateApi?: () => void
  onApiDefinitionChange?: (definition: ApiDefinitionDraft) => void
}

function ApiDefinitionChangeTracker({
  onChange,
}: {
  onChange?: (definition: ApiDefinitionDraft) => void
}) {
  const { state } = useApiDesigner()
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Notify the parent only when the definition itself changes. Depending on
  // `onChange` here would re-fire every render (the parent recreates it each
  // time), causing an infinite setState loop.
  useEffect(() => {
    onChangeRef.current?.(state.apiDefinition)
  }, [state.apiDefinition])

  return null
}

export function ProjectApiMainPanel({
  project,
  selectedApi,
  apiDefinition,
  draftDefinition,
  loading,
  activeTab = 'basic',
  testId,
  onTabChange,
  onOpenTest,
  onShowTestList,
  onCreateApi,
  onApiDefinitionChange,
}: ProjectApiMainPanelProps) {
  const archived = project.status === 'archived'
  const [newTestOpen, setNewTestOpen] = useState(false)
  const effectiveDefinition = draftDefinition ?? apiDefinition

  return (
    <section className="flex h-full w-full min-w-0 flex-col bg-white">
      {selectedApi && effectiveDefinition ? (
        <ApiDesignerProvider
          key={effectiveDefinition.id ?? selectedApi.id}
          initialApiDefinition={effectiveDefinition}
        >
          <ApiDefinitionChangeTracker onChange={onApiDefinitionChange} />
          <Tabs
            value={activeTab}
            onValueChange={(value) => onTabChange?.(value as ProjectApiWorkspaceTab)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 pt-3">
              <TabsList className="h-9 bg-transparent p-0">
                <TabsTrigger
                  value="basic"
                  className="h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  基本信息
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  onClick={() => {
                    if (testId) {
                      onShowTestList?.()
                    }
                  }}
                >
                  测试历史
                </TabsTrigger>
                <TabsTrigger
                  value="invocations"
                  className="h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  调用日志
                </TabsTrigger>
              </TabsList>
              {activeTab === 'basic' ? (
                <div className="pb-1">
                  <ApiDesignerToolbar disabled={archived} />
                </div>
              ) : null}
              {activeTab === 'history' ? (
                <div className="flex items-center gap-2 pb-1">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={archived}
                    onClick={() => setNewTestOpen(true)}
                  >
                    <FilePlus2 aria-hidden="true" className="mr-1.5 h-4 w-4" />
                    新建测试
                  </Button>
                  <Button size="sm" type="button" disabled={archived}>
                    <Play aria-hidden="true" className="mr-1.5 h-4 w-4" />
                    运行测试
                  </Button>
                </div>
              ) : null}
            </div>

            <TabsContent value="basic" className="m-0 flex-1 overflow-hidden bg-slate-50 p-3">
              {activeTab === 'basic' ? (
                <div className="flex h-full min-h-0 flex-col">
                  <ResizablePanelGroup
                    autoSaveId="project-api-designer-layout"
                    orientation="horizontal"
                    className="min-h-0 flex-1"
                  >
                    <ResizablePanel id="design" className="min-w-0" defaultSize="45%" minSize="30%" maxSize="60%">
                      <LeftDesignPanel />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel id="workflow" className="min-w-0" defaultSize="55%" minSize="40%" maxSize="70%">
                      <WorkflowPanel />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="history" className="m-0 min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
              <ProjectApiTestHistoryTab
                apiDefinition={effectiveDefinition}
                selectedTestId={testId}
                onSelectTest={(nextTestId) => onOpenTest?.(nextTestId)}
              />
            </TabsContent>

            <TabsContent value="invocations" className="m-0 min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
              <ProjectApiInvocationLogTab apiDefinition={effectiveDefinition} />
            </TabsContent>
          </Tabs>
          <ProjectApiNewTestDialog
            open={newTestOpen}
            onOpenChange={setNewTestOpen}
            defaultName={getNextTestName()}
            onConfirm={(name) => onOpenTest?.(toTestId(name))}
          />
        </ApiDesignerProvider>
      ) : selectedApi ? (
        <div className="grid flex-1 place-items-center bg-slate-50 p-8">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>{loading ? '加载 API 详情中' : 'API 详情不可用'}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500">
              {loading ? '正在读取接口设计、参数定义和请求步骤。' : '请重新选择 API 或刷新页面。'}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid flex-1 place-items-center bg-slate-50 p-8">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>暂无 API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-500">
              <p>当前项目还没有 API。创建后将在这里展示接口设计和请求步骤。</p>
              {archived ? (
                <Button disabled>项目已归档</Button>
              ) : (
                <Button type="button" onClick={onCreateApi}>
                  添加 API
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  )
}
