import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { VariableKindBadge } from '@/modules/variables/components/variable-kind-badge'
import { VariableValueDisplay } from '@/modules/variables/components/variable-value-display'
import type { Variable } from '@/shared/contracts/variable.contract'

type VariableReadOnlyTableProps = {
  variables: Variable[]
  emptyHint?: string
}

export function VariableReadOnlyTable({
  variables,
  emptyHint = '暂无变量。',
}: VariableReadOnlyTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">变量名</TableHead>
          <TableHead className="w-[160px]">显示名</TableHead>
          <TableHead className="w-[110px]">类型</TableHead>
          <TableHead>值</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {variables.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-sm text-slate-400">
              {emptyHint}
            </TableCell>
          </TableRow>
        ) : (
          variables.map((variable) => (
            <TableRow key={variable.id}>
              <TableCell className="font-mono text-sm text-slate-900">{variable.name}</TableCell>
              <TableCell className="text-sm text-slate-700">{variable.label}</TableCell>
              <TableCell>
                <VariableKindBadge kind={variable.kind} />
              </TableCell>
              <TableCell>
                <VariableValueDisplay variable={variable} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
