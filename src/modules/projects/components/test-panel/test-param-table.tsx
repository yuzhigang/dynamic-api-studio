import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/projects/state/api-designer-actions'
import { RequiredMark } from '@/components/common/required-mark'

export function TestParamTable() {
  const { state, dispatch } = useApiDesigner()

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">请求参数</h3>
      <div className="rounded-md border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>参数名</TableHead>
              <TableHead>参数值</TableHead>
              <TableHead className="w-[72px]">类型</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.apiDefinition.requestParams.map((param) => (
              <TableRow key={param.id}>
                <TableCell>
                  {param.name}
                  {param.required ? <RequiredMark /> : null}
                </TableCell>
                <TableCell>
                  <Input
                    className="h-7"
                    value={state.testParams[param.name] ?? ''}
                    onChange={(event) =>
                      dispatch(apiDesignerActions.setTestParam(param.name, event.target.value))
                    }
                  />
                </TableCell>
                <TableCell>{param.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
