import { Check, Pencil, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { DeleteVariableDialog } from '@/modules/variables/components/delete-variable-dialog'
import { VariableEditCells } from '@/modules/variables/components/variable-edit-cells'
import { VariableKindBadge } from '@/modules/variables/components/variable-kind-badge'
import { VariableValueDisplay } from '@/modules/variables/components/variable-value-display'
import { normalizeVariableDraft, toVariableDraft } from '@/modules/variables/utils/variable-draft'
import type { Variable, VariableDraft } from '@/shared/contracts/variable.contract'

type EditableVariableRowProps = {
  variable: Variable
  isEditing: boolean
  onEditStart: () => void
  onEditEnd: () => void
  onSave: (draft: VariableDraft) => Promise<unknown>
  onDelete: (variableId: string) => void
}

export function EditableVariableRow({
  variable,
  isEditing,
  onEditStart,
  onEditEnd,
  onSave,
  onDelete,
}: EditableVariableRowProps) {
  const [draft, setDraft] = useState(() => toVariableDraft(variable))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing) {
      setDraft(toVariableDraft(variable))
      setError(null)
      setSubmitting(false)
    }
  }, [isEditing, variable])

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell className="font-mono text-sm text-slate-900">{variable.name}</TableCell>
        <TableCell className="text-sm text-slate-700">{variable.label}</TableCell>
        <TableCell>
          <VariableKindBadge kind={variable.kind} />
        </TableCell>
        <TableCell>
          <VariableValueDisplay variable={variable} />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={onEditStart}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">编辑</span>
            </Button>
            <DeleteVariableDialog variable={variable} onConfirm={() => onDelete(variable.id)} />
          </div>
        </TableCell>
      </TableRow>
    )
  }

  const handleSave = () => {
    setError(null)
    setSubmitting(true)
    onSave(normalizeVariableDraft(draft))
      .then(() => onEditEnd())
      .catch((mutationError) => {
        setSubmitting(false)
        setError(mutationError instanceof Error ? mutationError.message : '保存失败')
      })
  }

  return (
    <TableRow>
      <VariableEditCells draft={draft} onChange={setDraft} />
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={handleSave} disabled={submitting}>
              <Check className="h-4 w-4" />
              保存
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onEditEnd}>
              <X className="h-4 w-4" />
              取消
            </Button>
          </div>
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
        </div>
      </TableCell>
    </TableRow>
  )
}
