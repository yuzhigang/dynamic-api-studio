import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SchemaTreeTable } from '@/modules/projects/components/response-schema/schema-tree-table'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/projects/state/api-designer-actions'

export function ResponseSchemaSection() {
  const { dispatch } = useApiDesigner()

  return (
    <Card>
      <CardHeader>
        <CardTitle>返回值结构（响应 Schema）</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={() => dispatch(apiDesignerActions.addSchemaField())}
        >
          <Plus aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
          新增字段
        </Button>
      </CardHeader>
      <CardContent>
        <SchemaTreeTable />
      </CardContent>
    </Card>
  )
}
