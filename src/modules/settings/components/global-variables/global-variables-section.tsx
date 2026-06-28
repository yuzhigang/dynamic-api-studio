import { VariableTable } from '@/modules/variables/components/variable-table'
import { useGlobalVariablesQuery } from '@/modules/settings/hooks/use-global-variables-query'
import { useDeleteGlobalVariable } from '@/modules/settings/hooks/use-delete-global-variable'
import { useSaveGlobalVariable } from '@/modules/settings/hooks/use-save-global-variable'

export function GlobalVariablesSection() {
  const query = useGlobalVariablesQuery()
  const save = useSaveGlobalVariable()
  const remove = useDeleteGlobalVariable()
  const variables = query.data ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
        <div className="max-w-4xl">
          <h2 className="text-sm font-semibold text-slate-900">全局变量</h2>
          <p className="text-xs text-slate-500">
            定义可在全局复用的变量，支持单值或一组枚举值。点击行内「编辑」修改，底部空行可直接新增。
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="max-w-4xl">
          {query.isLoading ? (
            <p className="text-sm text-slate-500">加载全局变量中…</p>
          ) : query.isError ? (
            <div className="grid min-h-[180px] place-items-center rounded-md border border-dashed border-red-300 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-600">加载全局变量失败，请稍后重试。</p>
            </div>
          ) : (
            <VariableTable
              variables={variables}
              onSave={(draft) => save.mutateAsync(draft)}
              onDelete={(id) => remove.mutate(id)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
