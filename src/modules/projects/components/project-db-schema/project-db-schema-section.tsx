import { useState } from 'react'

import { Database, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useDeleteProjectDbSchemaMutation,
  useProjectDbSchemaListQuery,
  useProjectDbSchemaSourceObjectsQuery,
  useSyncProjectDbSchemaMutation,
} from '@/modules/projects/hooks/use-project-db-schema'

type ProjectDbSchemaSectionProps = {
  projectId: string
}

export function ProjectDbSchemaSection({ projectId }: ProjectDbSchemaSectionProps) {
  const [syncOpen, setSyncOpen] = useState(false)
  const listQuery = useProjectDbSchemaListQuery(projectId)
  const sourceObjectsQuery = useProjectDbSchemaSourceObjectsQuery(projectId)
  const syncMutation = useSyncProjectDbSchemaMutation(projectId)
  const deleteMutation = useDeleteProjectDbSchemaMutation(projectId)
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set())

  const schemas = listQuery.data ?? []
  const sourceObjects = sourceObjectsQuery.data

  const handleToggle = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const handleSync = () => {
    syncMutation.mutate(
      { objectNames: Array.from(selectedNames) },
      {
        onSuccess: () => {
          setSelectedNames(new Set())
          setSyncOpen(false)
        },
      },
    )
  }

  return (
    <Card className="bg-white">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">数据模型</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedNames(new Set())
            setSyncOpen(true)
          }}
          disabled={sourceObjectsQuery.isLoading || sourceObjectsQuery.data?.available === false}
        >
          <Database className="mr-1.5 h-4 w-4" />
          从数据源同步
        </Button>
      </CardHeader>
      <CardContent>
        {sourceObjectsQuery.data?.available === false ? (
          <p className="text-sm text-slate-500">{sourceObjectsQuery.data.reason}</p>
        ) : null}

        {listQuery.isLoading ? (
          <p className="text-sm text-slate-500">加载中…</p>
        ) : schemas.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-500">
            暂无数据模型。点击上方按钮从数据源同步表/视图。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>对象名</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>列数</TableHead>
                <TableHead>来源</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schemas.map((schema) => (
                <TableRow key={schema.id}>
                  <TableCell className="font-medium">
                    {schema.schemaName ? `${schema.schemaName}.` : ''}
                    {schema.objectName}
                  </TableCell>
                  <TableCell className="capitalize">{schema.objectType}</TableCell>
                  <TableCell>{schema.columns.length}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {schema.dbSourceId ? '数据源同步' : '手动创建'}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-red-600"
                      onClick={() => deleteMutation.mutate({ dbSchemaId: schema.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">从数据源同步</DialogTitle>
            </DialogHeader>
            {sourceObjectsQuery.isLoading ? (
              <p className="text-sm text-slate-500">加载可同步对象中…</p>
            ) : sourceObjects?.available === false ? (
              <p className="text-sm text-slate-500">{sourceObjects.reason}</p>
            ) : (
              <div className="max-h-[360px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>对象名</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>列数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceObjects?.objects.map((obj) => (
                      <TableRow key={obj.name}>
                        <TableCell>
                          <Checkbox
                            checked={selectedNames.has(obj.name)}
                            onCheckedChange={() => handleToggle(obj.name)}
                          />
                        </TableCell>
                        <TableCell>
                          {obj.schemaName ? `${obj.schemaName}.` : ''}
                          {obj.name}
                        </TableCell>
                        <TableCell className="capitalize">{obj.objectType ?? 'table'}</TableCell>
                        <TableCell>{obj.columns.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSyncOpen(false)}>
                取消
              </Button>
              <Button
                type="button"
                disabled={selectedNames.size === 0 || syncMutation.isPending}
                onClick={handleSync}
              >
                <RefreshCw
                  className={`mr-1.5 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
                />
                同步 {selectedNames.size} 个对象
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
