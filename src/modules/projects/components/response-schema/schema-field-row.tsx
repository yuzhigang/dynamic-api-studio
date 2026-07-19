import { ChevronDown, Minus } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { TreeIndent } from '@/components/tree-table/tree-indent'
import { SchemaRowActions } from '@/modules/projects/components/response-schema/schema-row-actions'
import { SchemaTypeSelect } from '@/modules/projects/components/response-schema/schema-type-select'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/projects/state/api-designer-actions'
import type { SchemaField } from '@/shared/contracts/api-definition.contract'

type SchemaFieldRowProps = {
  field: SchemaField
  level: number
}

export function SchemaFieldRow({ field, level }: SchemaFieldRowProps) {
  const { dispatch } = useApiDesigner()
  const hasChildren = Boolean(field.children?.length)

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center">
            <TreeIndent level={level} />
            {hasChildren ? (
              <ChevronDown className="mr-1 h-3.5 w-3.5 text-slate-500" />
            ) : (
              <Minus className="mr-1 h-3.5 w-3.5 text-slate-400" />
            )}
            <Input
              id={`schema-name-${field.id}`}
              name={`schema-name-${field.id}`}
              aria-label={`字段 ${field.name || '未命名'} 名称`}
              autoComplete="off"
              className="h-7 border-transparent bg-transparent px-1 shadow-none focus-visible:bg-white"
              value={field.name}
              onChange={(event) =>
                dispatch(apiDesignerActions.updateSchemaField(field.id, { name: event.target.value }))
              }
            />
          </div>
        </TableCell>
        <TableCell>
          <SchemaTypeSelect
            value={field.type}
            aria-label={`字段 ${field.name || '未命名'} 类型`}
            onChange={(value) => dispatch(apiDesignerActions.updateSchemaField(field.id, { type: value }))}
          />
        </TableCell>
        <TableCell>
          <Checkbox
            id={`schema-required-${field.id}`}
            name={`schema-required-${field.id}`}
            aria-label={`字段 ${field.name || '未命名'} 是否必填`}
            checked={field.required}
            onCheckedChange={(checked) =>
              dispatch(apiDesignerActions.updateSchemaField(field.id, { required: checked === true }))
            }
          />
        </TableCell>
        <TableCell>
          <Input
            id={`schema-description-${field.id}`}
            name={`schema-description-${field.id}`}
            aria-label={`字段 ${field.name || '未命名'} 描述`}
            autoComplete="off"
            className="h-7 border-transparent bg-transparent px-1 shadow-none focus-visible:bg-white"
            value={field.description ?? ''}
            onChange={(event) =>
              dispatch(apiDesignerActions.updateSchemaField(field.id, { description: event.target.value }))
            }
          />
        </TableCell>
        <TableCell>
          <SchemaRowActions fieldId={field.id} fieldName={field.name} />
        </TableCell>
      </TableRow>
      {field.children?.map((child) => (
        <SchemaFieldRow key={child.id} field={child} level={level + 1} />
      ))}
    </>
  )
}
