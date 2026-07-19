import { useState } from 'react'

import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  useDeleteProjectCustomFunctionMutation,
  useProjectCustomFunctionsQuery,
  useSaveProjectCustomFunctionMutation,
} from '@/modules/projects/hooks/use-custom-function'
import type { CustomFunction, CustomFunctionDraft } from '@/shared/contracts/custom-function.contract'

const emptyDraft: CustomFunctionDraft = {
  scope: 'project',
  name: '',
  label: '',
  language: 'javascript',
  body: '',
  description: '',
  inputSchema: [],
  outputSchema: [],
}

type ProjectCustomFunctionsSectionProps = {
  projectId: string
}

export function ProjectCustomFunctionsSection({ projectId }: ProjectCustomFunctionsSectionProps) {
  const listQuery = useProjectCustomFunctionsQuery(projectId)
  const saveMutation = useSaveProjectCustomFunctionMutation(projectId)
  const deleteMutation = useDeleteProjectCustomFunctionMutation(projectId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CustomFunction | null>(null)
  const [draft, setDraft] = useState<CustomFunctionDraft>(emptyDraft)

  const functions = listQuery.data ?? []

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft)
    setDialogOpen(true)
  }

  const openEdit = (fn: CustomFunction) => {
    setEditing(fn)
    setDraft({
      scope: 'project',
      name: fn.name,
      label: fn.label ?? '',
      language: fn.language,
      body: fn.body,
      description: fn.description ?? '',
      inputSchema: fn.inputSchema,
      outputSchema: fn.outputSchema,
    })
    setDialogOpen(true)
  }

  const handleSave = () => {
    const payload = editing ? { ...draft, id: editing.id } : draft
    saveMutation.mutate(payload, {
      onSuccess: () => {
        setDialogOpen(false)
        setDraft(emptyDraft)
        setEditing(null)
      },
    })
  }

  const canSubmit = draft.name.trim().length > 0 && draft.body.trim().length > 0

  return (
    <Card className="bg-white">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">自定义函数</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新增函数
        </Button>
      </CardHeader>
      <CardContent>
        {listQuery.isLoading ? (
          <p className="text-sm text-slate-500">加载中…</p>
        ) : functions.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-500">
            暂无项目级自定义函数。点击上方按钮新增。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>函数名</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>语言</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {functions.map((fn) => (
                <TableRow key={fn.id}>
                  <TableCell className="font-medium">{fn.name}</TableCell>
                  <TableCell className="text-slate-500">{fn.label ?? '-'}</TableCell>
                  <TableCell className="text-xs text-slate-500">{fn.language}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                        onClick={() => openEdit(fn)}
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-red-600"
                        onClick={() => deleteMutation.mutate(fn.id)}
                        disabled={deleteMutation.isPending}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base">{editing ? '编辑函数' : '新增函数'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cf-name">函数名</Label>
                  <Input
                    id="cf-name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="camelCase 函数名"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cf-label">标签</Label>
                  <Input
                    id="cf-label"
                    value={draft.label ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                    placeholder="显示名称"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-body">函数体</Label>
                <Textarea
                  id="cf-body"
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  placeholder="function myFn(args) { ... }"
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-desc">说明</Label>
                <Textarea
                  id="cf-desc"
                  value={draft.description ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="函数用途说明"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="button" disabled={!canSubmit || saveMutation.isPending} onClick={handleSave}>
                {saveMutation.isPending ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
