import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SchemaFieldRow } from '@/modules/project-management/components/response-schema/schema-field-row'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/project-management/state/api-designer-actions'

export function SchemaTreeTable() {
  const { state, dispatch } = useApiDesigner()
  const fields = state.apiDefinition.responseSchema

  if (fields.length === 0) {
    return (
      <div className="grid min-h-28 place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center">
        <div className="space-y-2">
          <p className="text-sm text-slate-500">尚未定义响应字段</p>
          <Button type="button" size="sm" onClick={() => dispatch(apiDesignerActions.addSchemaField())}>
            <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
            新增字段
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>字段名</TableHead>
            <TableHead className="w-[22%]">类型</TableHead>
            <TableHead className="w-[12%]">必填</TableHead>
            <TableHead className="w-[24%]">描述</TableHead>
            <TableHead className="w-[90px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => (
            <SchemaFieldRow key={field.id} field={field} level={0} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
