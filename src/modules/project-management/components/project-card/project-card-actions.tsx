import { useState } from 'react'
import { Archive, Copy, MoreHorizontal } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { ProjectFormDialog } from '@/modules/project-management/components/project-form/project-form-dialog'
import { useArchiveProject } from '@/modules/project-management/hooks/use-archive-project'
import { useCopyProject } from '@/modules/project-management/hooks/use-copy-project'
import type { Project } from '@/shared/contracts/project.contract'

type ProjectCardActionsProps = {
  project: Project
}

export function ProjectCardActions({ project }: ProjectCardActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const archiveMutation = useArchiveProject()
  const copyMutation = useCopyProject()

  return (
    <div>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <DropdownMenuTrigger
                type="button"
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                aria-label={`打开项目「${project.name}」操作菜单`}
              >
                <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
              </DropdownMenuTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>项目操作</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            disabled={copyMutation.isPending}
            onSelect={() => copyMutation.mutate(project.id)}
          >
            <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
            复制项目
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>编辑项目</DropdownMenuItem>
          {project.status === 'active' ? (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700"
              disabled={archiveMutation.isPending}
              onSelect={() => setArchiveOpen(true)}
            >
              <Archive aria-hidden="true" className="mr-2 h-4 w-4" />
              归档项目
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ProjectFormDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        showTrigger={false}
        initialValue={{
          id: project.id,
          code: project.code,
          name: project.name,
          description: project.description,
          icon: project.icon,
          color: project.color,
        }}
      />
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>归档项目</AlertDialogTitle>
            <AlertDialogDescription>
              确认归档项目「{project.name}」？归档后该项目下不能继续创建 API。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate(project.id)}
            >
              {archiveMutation.isPending ? '归档中…' : '归档项目'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
