import { Copy, PlusCircle, Trash2 } from 'lucide-react'

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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/projects/state/api-designer-actions'

type WorkflowStepToolbarProps = {
  stepId: string
  stepTitle: string
  isAssemble?: boolean
}

export function WorkflowStepToolbar({ stepId, stepTitle, isAssemble }: WorkflowStepToolbarProps) {
  const { dispatch } = useApiDesigner()

  // The assemble step is fixed as the final step and cannot be deleted, copied,
  // or have a step inserted after it.
  if (isAssemble) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-primary"
        onClick={() => dispatch(apiDesignerActions.addWorkflowStep(stepId, 'sql-query'))}
      >
        <PlusCircle aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
        添加下一步
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary"
            aria-label={`复制步骤 ${stepTitle}`}
            onClick={() => dispatch(apiDesignerActions.copyWorkflowStep(stepId))}
          >
            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>复制步骤</TooltipContent>
      </Tooltip>

      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label={`删除步骤 ${stepTitle}`}
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>删除步骤</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除工作流步骤？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除“{stepTitle}”及其中的配置，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => dispatch(apiDesignerActions.removeWorkflowStep(stepId))}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
