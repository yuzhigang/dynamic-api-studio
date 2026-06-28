import { Braces, Database, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WorkflowStepList } from '@/modules/project-management/components/workflow/workflow-step-list'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/project-management/state/api-designer-actions'

export function WorkflowPanel() {
  const { dispatch } = useApiDesigner()

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
        <h2 className="text-sm font-semibold text-slate-900">工作流步骤</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 px-2">
              <Plus aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
              新增步骤
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => dispatch(apiDesignerActions.addWorkflowStep('', 'sql-query'))}>
              <Database aria-hidden="true" className="mr-2 h-4 w-4" />
              SQL 查询
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => dispatch(apiDesignerActions.addWorkflowStep('', 'js-transform'))}>
              <Braces aria-hidden="true" className="mr-2 h-4 w-4" />
              JavaScript 转换
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <WorkflowStepList />
      </div>
    </Card>
  )
}
