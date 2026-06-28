import { useState } from 'react'

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EditableVariableRow } from '@/modules/variables/components/editable-variable-row'
import { NewVariableRow } from '@/modules/variables/components/new-variable-row'
import type { Variable, VariableDraft } from '@/shared/contracts/variable.contract'

type VariableTableProps = {
  variables: Variable[]
  onSave: (draft: VariableDraft) => Promise<unknown>
  onDelete: (variableId: string) => void
}

export function VariableTable({ variables, onSave, onDelete }: VariableTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">变量名</TableHead>
          <TableHead className="w-[160px]">显示名</TableHead>
          <TableHead className="w-[110px]">类型</TableHead>
          <TableHead>值</TableHead>
          <TableHead className="w-[150px] text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {variables.map((variable) => (
          <EditableVariableRow
            key={variable.id}
            variable={variable}
            isEditing={editingId === variable.id}
            onEditStart={() => setEditingId(variable.id)}
            onEditEnd={() => setEditingId(null)}
            onSave={onSave}
            onDelete={onDelete}
          />
        ))}
        <NewVariableRow onSave={onSave} />
      </TableBody>
    </Table>
  )
}
