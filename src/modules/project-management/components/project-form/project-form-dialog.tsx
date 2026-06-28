import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ProjectBasicFields } from '@/modules/project-management/components/project-form/project-basic-fields'
import { useSaveProject } from '@/modules/project-management/hooks/use-save-project'
import { createEmptyProject } from '@/modules/project-management/utils/create-empty-project'
import { cn } from '@/lib/cn'
import type { ProjectDraft } from '@/shared/contracts/project.contract'

type ProjectFormDialogProps = {
  mode: 'create' | 'edit'
  initialValue?: ProjectDraft
  triggerLabel?: string
  triggerVariant?: 'default' | 'outline' | 'ghost'
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  onSaved?: () => void
}

export function ProjectFormDialog({
  mode,
  initialValue,
  triggerLabel,
  triggerVariant = 'default',
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
  onSaved,
}: ProjectFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [draft, setDraft] = useState<ProjectDraft>(initialValue ?? createEmptyProject())
  const mutation = useSaveProject()
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setDraft(initialValue ?? createEmptyProject())
    }
  }, [initialValue, open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant={triggerVariant}
            size="sm"
            className={triggerClassName}
            onClick={(event) => event.stopPropagation()}
          >
            {mode === 'create' ? <Plus className="mr-1.5 h-4 w-4" /> : null}
            {triggerLabel ?? (mode === 'create' ? '创建项目' : '编辑项目')}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-xl p-0" onClick={(event) => event.stopPropagation()}>
        <DialogHeader className="border-b border-slate-200 px-4 py-3">
          <DialogTitle className="text-sm">{mode === 'create' ? '创建项目' : '编辑项目'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-5 p-4"
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate(draft, {
              onSuccess: (project) => {
                setOpen(false)
                onSaved?.()
                if (mode === 'create') {
                  navigate({ to: '/projects/$projectId', params: { projectId: project.id } })
                }
              },
            })
          }}
        >
          <ProjectBasicFields value={draft} onChange={setDraft} />
          {mutation.error ? (
            <p className="text-sm text-red-600">
              {mutation.error instanceof Error ? mutation.error.message : '保存失败'}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className={cn(mutation.isPending && 'opacity-80')}
            >
              <Save className="mr-1.5 h-4 w-4" />
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
