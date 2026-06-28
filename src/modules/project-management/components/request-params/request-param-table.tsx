import { useEffect, useRef } from 'react'

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RequestParamRow } from '@/modules/project-management/components/request-params/request-param-row'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/project-management/state/api-designer-actions'
import type { RequestParam } from '@/shared/contracts/api-definition.contract'

type RequestParamTableProps = {
  location: RequestParam['location']
}

export function RequestParamTable({ location }: RequestParamTableProps) {
  const { state, dispatch } = useApiDesigner()
  const params = state.apiDefinition.requestParams.filter((param) => param.location === location)
  const ensuredEmptyRow = useRef(false)

  // 参数表为空时，始终保留一行空行供编辑。
  useEffect(() => {
    if (params.length === 0) {
      if (!ensuredEmptyRow.current) {
        ensuredEmptyRow.current = true
        dispatch(apiDesignerActions.addRequestParam(location))
      }
    } else {
      ensuredEmptyRow.current = false
    }
  }, [params.length, location, dispatch])

  return (
    <div className="rounded-md border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[22%]">参数名</TableHead>
            <TableHead className="w-[18%]">类型</TableHead>
            <TableHead className="w-[12%]">必填</TableHead>
            <TableHead className="w-[22%]">示例值</TableHead>
            <TableHead>描述</TableHead>
            <TableHead className="w-20 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {params.map((param) => (
            <RequestParamRow key={param.id} param={param} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
