import { useEffect, useState } from 'react'

import { Pencil, Plus, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ProjectDbSchemaForm } from '@/modules/projects/components/project-db-schema/project-db-schema-form'
import {
  useProjectDbSchemaQuery,
  useSaveProjectDbSchemaMutation,
} from '@/modules/projects/hooks/use-project-db-schema'
import type {
  ProjectDbSchema,
  ProjectDbSchemaDraft,
} from '@/shared/contracts/project-db-schema.contract'

type Mode = 'create' | 'edit'

type ProjectDbSchemaEditorDialogProps = {
  projectId: string
  mode: Mode
  dbSchemaId?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: (schema: ProjectDbSchema) => void
}

function createEmptyDraft(projectId: string): ProjectDbSchemaDraft {
  return {
    projectId,
    objectType: 'table',
    objectName: '',
    schemaName: undefined,
    columns: [],
    indexes: [],
    foreignKeys: [],
    comment: undefined,
  }
}

export function ProjectDbSchemaEditorDialog({
  projectId,
  mode,
  dbSchemaId,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSaved,
}: ProjectDbSchemaEditorDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [draft, setDraft] = useState<ProjectDbSchemaDraft>(() => createEmptyDraft(projectId))

  const existingQuery = useProjectDbSchemaQuery(projectId, dbSchemaId)
  const saveMutation = useSaveProjectDbSchemaMutation(projectId)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && existingQuery.data) {
      const data = existingQuery.data
      setDraft({
        id: data.id,
        projectId: data.projectId,
        schemaName: data.schemaName,
        objectType: data.objectType,
        objectName: data.objectName,
        columns: data.columns,
        foreignKeys: data.foreignKeys,
        indexes: data.indexes,
        comment: data.comment,
      })
    } else if (mode === 'create') {
      setDraft(createEmptyDraft(projectId))
    }
  }, [open, mode, existingQuery.data, projectId])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    saveMutation.mutate(draft, {
      onSuccess: (schema) => {
        setOpen(false)
        onSaved?.(schema)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="border-b border-slate-200 px-4 py-3">
          <DialogTitle className="text-sm">
            {mode === 'create' ? '新增数据模型' : '编辑数据模型'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex h-[80vh] flex-col">
          <div className="flex-1 overflow-auto p-4">
            {mode === 'edit' && existingQuery.isLoading ? (
              <p className="text-sm text-slate-500">加载中…</p>
            ) : (
              <ProjectDbSchemaForm value={draft} onChange={setDraft} />
            )}
            {saveMutation.error ? (
              <p className="mt-3 text-sm text-red-600">
                {saveMutation.error instanceof Error ? saveMutation.error.message : '保存失败'}
              </p>
            ) : null}
          </div>
          <DialogFooter className="border-t border-slate-200 px-4 py-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="mr-1.5 h-4 w-4" />
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type ProjectDbSchemaEditorTriggerProps = {
  projectId: string
  mode: Mode
  dbSchemaId?: string
  size?: 'default' | 'sm' | 'icon'
  className?: string
  onSaved?: (schema: ProjectDbSchema) => void
}

export function ProjectDbSchemaEditorButton({
  projectId,
  mode,
  dbSchemaId,
  size = 'default',
  className,
  onSaved,
}: ProjectDbSchemaEditorTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <ProjectDbSchemaEditorDialog
      projectId={projectId}
      mode={mode}
      dbSchemaId={dbSchemaId}
      open={open}
      onOpenChange={setOpen}
      onSaved={onSaved}
      trigger={
        mode === 'create' ? (
          <Button type="button" variant="outline" size={size === 'icon' ? 'sm' : size} className={className}>
            <Plus className="mr-1.5 h-4 w-4" />
            新增模型
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 text-slate-500 hover:text-indigo-600 ${className ?? ''}`}
            onClick={() => setOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )
      }
    />
  )
}
