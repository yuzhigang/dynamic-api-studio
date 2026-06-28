import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableCell } from '@/components/ui/table'
import { TagListEditor } from '@/modules/variables/components/tag-list-editor'
import type { VariableDraft, VariableKind } from '@/shared/contracts/variable.contract'

type VariableEditCellsProps = {
  draft: VariableDraft
  onChange: (draft: VariableDraft) => void
  namePlaceholder?: string
  labelPlaceholder?: string
}

export function VariableEditCells({
  draft,
  onChange,
  namePlaceholder = '例如 default_page_size',
  labelPlaceholder = '例如 默认分页大小',
}: VariableEditCellsProps) {
  return (
    <>
      <TableCell>
        <Input
          aria-label="变量名"
          autoComplete="off"
          value={draft.name}
          placeholder={namePlaceholder}
          className="h-8 font-mono text-sm"
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label="显示名"
          autoComplete="off"
          value={draft.label}
          placeholder={labelPlaceholder}
          className="h-8 text-sm"
          onChange={(event) => onChange({ ...draft, label: event.target.value })}
        />
      </TableCell>
      <TableCell>
        <Select
          value={draft.kind}
          onValueChange={(value) => onChange({ ...draft, kind: value as VariableKind })}
        >
          <SelectTrigger className="h-8" aria-label="类型">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">单值</SelectItem>
            <SelectItem value="list">枚举值</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {draft.kind === 'single' ? (
          <Input
            aria-label="值"
            autoComplete="off"
            value={draft.value}
            className="h-8 font-mono text-sm"
            onChange={(event) => onChange({ ...draft, value: event.target.value })}
          />
        ) : (
          <TagListEditor items={draft.items} onChange={(items) => onChange({ ...draft, items })} />
        )}
      </TableCell>
    </>
  )
}
