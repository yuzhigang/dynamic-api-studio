import { useGlobalVariablesQuery } from '@/modules/settings/hooks/use-global-variables-query'
import {
  useDeleteProjectVariable,
  useProjectVariablesQuery,
  useSaveProjectVariable,
} from '@/modules/projects/hooks/use-project-variable'
import { VariableReadOnlyTable } from '@/modules/variables/components/variable-read-only-table'
import { VariableTable } from '@/modules/variables/components/variable-table'

type ProjectApiVariablesTabProps = {
  projectId: string
}

export function ProjectApiVariablesTab({ projectId }: ProjectApiVariablesTabProps) {
  const projectVariablesQuery = useProjectVariablesQuery(projectId)
  const saveProjectVariable = useSaveProjectVariable(projectId)
  const deleteProjectVariable = useDeleteProjectVariable(projectId)
  const globalVariablesQuery = useGlobalVariablesQuery()

  return (
    <div className="max-w-4xl space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">项目变量</h3>
          <p className="text-xs text-slate-500">
            仅在当前项目内生效。点击行内「编辑」修改，底部空行可直接新增。
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white">
          {projectVariablesQuery.isLoading ? (
            <p className="p-4 text-sm text-slate-500">加载项目变量中…</p>
          ) : projectVariablesQuery.isError ? (
            <p className="p-4 text-sm text-red-600">加载项目变量失败，请稍后重试。</p>
          ) : (
            <VariableTable
              variables={projectVariablesQuery.data ?? []}
              onSave={(draft) => saveProjectVariable.mutateAsync(draft)}
              onDelete={(variableId) => deleteProjectVariable.mutate(variableId)}
            />
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">全局变量（只读）</h3>
          <p className="text-xs text-slate-500">在系统设置中维护，所有项目共享，此处仅供查看。</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white">
          {globalVariablesQuery.isLoading ? (
            <p className="p-4 text-sm text-slate-500">加载全局变量中…</p>
          ) : globalVariablesQuery.isError ? (
            <p className="p-4 text-sm text-red-600">加载全局变量失败，请稍后重试。</p>
          ) : (
            <VariableReadOnlyTable
              variables={globalVariablesQuery.data ?? []}
              emptyHint="暂无全局变量。"
            />
          )}
        </div>
      </section>
    </div>
  )
}
