import { AppPage } from '@/layouts/app-shell/app-page'
import { ProjectCardGrid } from '@/modules/project-management/components/project-card/project-card-grid'
import { ProjectFormDialog } from '@/modules/project-management/components/project-form/project-form-dialog'
import { useProjectListQuery } from '@/modules/project-management/hooks/use-project-query'

export function ProjectListPage() {
  const query = useProjectListQuery()

  return (
    <AppPage
      title={
        <div>
          <h1 className="text-base font-semibold text-slate-900">项目</h1>
          <p className="text-sm text-slate-500">以项目为单位组织和管理 API。</p>
        </div>
      }
      actions={<ProjectFormDialog mode="create" />}
    >
      <div className="h-full overflow-auto p-5">
        <ProjectCardGrid projects={query.data ?? []} loading={query.isLoading} />
      </div>
    </AppPage>
  )
}
