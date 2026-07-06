import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { VariableEditCells } from '@/modules/variables/components/variable-edit-cells'
import {
  createEmptyVariableDraft,
  normalizeVariableDraft,
} from '@/modules/variables/utils/variable-draft'
import type { VariableDraft } from '@/shared/contracts/variable.contract'

type NewVariableRowProps = {
  onSave: (draft: VariableDraft) => Promise<unknown>
}

export function NewVariableRow({ onSave }: NewVariableRowProps) {
  const [draft, setDraft] = useState(createEmptyVariableDraft)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = draft.name.trim() !== '' && draft.label.trim() !== ''

  const handleSave = () => {
    setError(null)
    setSubmitting(true)
    onSave(normalizeVariableDraft(draft))
      .then(() => {
        setSubmitting(false)
        setDraft(createEmptyVariableDraft())
      })
      .catch((mutationError) => {
        setSubmitting(false)
        setError(mutationError instanceof Error ? mutationError.message : '保存失败')
      })
  }

  return (
    <TableRow className="bg-slate-50/60">
      <VariableEditCells
        draft={draft}
        onChange={setDraft}
        namePlaceholder="新变量名…"
        labelPlaceholder="新显示名…"
      />
      <TableCell className="h-7 text-right">
        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleSave}
            disabled={!canSave || submitting}
          >
            <Plus className="h-4 w-4" />
            添加
          </Button>
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
        </div>
      </TableCell>
    </TableRow>
  )
}
