import { ListPlus, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/project-management/state/api-designer-actions'

type SchemaRowActionsProps = {
  fieldId: string
  fieldName: string
}

export function SchemaRowActions({ fieldId, fieldName }: SchemaRowActionsProps) {
  const { dispatch } = useApiDesigner()
  const accessibleName = fieldName || '未命名'

  return (
    <div className="flex justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={`为字段 ${accessibleName} 新增子项`}
            onClick={() => dispatch(apiDesignerActions.addSchemaChild(fieldId))}
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>新增子项</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={`在字段 ${accessibleName} 后新增同级`}
            onClick={() => dispatch(apiDesignerActions.addSchemaSibling(fieldId))}
          >
            <ListPlus aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>新增同级</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            aria-label={`删除字段 ${accessibleName}`}
            onClick={() => dispatch(apiDesignerActions.removeSchemaField(fieldId))}
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>删除字段</TooltipContent>
      </Tooltip>
    </div>
  )
}
