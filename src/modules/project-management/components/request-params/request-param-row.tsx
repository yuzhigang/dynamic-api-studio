import { Plus, Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/project-management/state/api-designer-actions'
import type { RequestParam } from '@/shared/contracts/api-definition.contract'

type RequestParamRowProps = {
  param: RequestParam
}

export function RequestParamRow({ param }: RequestParamRowProps) {
  const { dispatch } = useApiDesigner()
  const rowName = param.name || '未命名'
  const fieldPrefix = `request-param-${param.id}`

  return (
    <TableRow>
      <TableCell>
        <Input
          id={`${fieldPrefix}-name`}
          name={`requestParams.${param.id}.name`}
          autoComplete="off"
          aria-label={`参数 ${rowName} 的名称`}
          className="h-7 border-transparent bg-transparent px-1 shadow-none focus-visible:bg-white"
          value={param.name}
          onChange={(event) =>
            dispatch(apiDesignerActions.updateRequestParam(param.id, { name: event.target.value }))
          }
        />
      </TableCell>
      <TableCell>
        <Select
          name={`requestParams.${param.id}.type`}
          value={param.type}
          onValueChange={(value) =>
            dispatch(apiDesignerActions.updateRequestParam(param.id, { type: value as RequestParam['type'] }))
          }
        >
          <SelectTrigger
            id={`${fieldPrefix}-type`}
            className="h-7 border-transparent bg-transparent px-1 shadow-none"
            aria-label={`参数 ${rowName} 的类型`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['string', 'integer', 'decimal', 'boolean'].map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Checkbox
          id={`${fieldPrefix}-required`}
          name={`requestParams.${param.id}.required`}
          checked={param.required}
          onCheckedChange={(checked) =>
            dispatch(apiDesignerActions.updateRequestParam(param.id, { required: checked === true }))
          }
          aria-label={`参数 ${rowName} 是否必填`}
        />
      </TableCell>
      <TableCell>
        <Input
          id={`${fieldPrefix}-example`}
          name={`requestParams.${param.id}.example`}
          autoComplete="off"
          aria-label={`参数 ${rowName} 的示例值`}
          className="h-7 border-transparent bg-transparent px-1 shadow-none focus-visible:bg-white"
          value={param.example ?? ''}
          onChange={(event) =>
            dispatch(apiDesignerActions.updateRequestParam(param.id, { example: event.target.value }))
          }
        />
      </TableCell>
      <TableCell>
        <Input
          id={`${fieldPrefix}-description`}
          name={`requestParams.${param.id}.description`}
          autoComplete="off"
          aria-label={`参数 ${rowName} 的描述`}
          className="h-7 border-transparent bg-transparent px-1 shadow-none focus-visible:bg-white"
          value={param.description ?? ''}
          onChange={(event) =>
            dispatch(apiDesignerActions.updateRequestParam(param.id, { description: event.target.value }))
          }
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={`在参数 ${rowName} 下方插入一行`}
                onClick={() =>
                  dispatch(apiDesignerActions.addRequestParam(param.location, param.id))
                }
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>在下方插入一行</TooltipContent>
          </Tooltip>
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <AlertDialogTrigger
                    type="button"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}
                    aria-label={`删除参数 ${rowName}`}
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </AlertDialogTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent>删除参数</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>删除参数</AlertDialogTitle>
                <AlertDialogDescription>确认删除参数「{rowName}」？此操作无法撤销。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => dispatch(apiDesignerActions.removeRequestParam(param.id))}
                >
                  删除参数
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}
