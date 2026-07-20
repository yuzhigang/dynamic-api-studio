import { useState } from 'react'

import { Play, Terminal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDbMigrationListQuery, useGenerateDbMigrationMutation } from '@/modules/projects/hooks/use-db-migration'
import { useProjectDbSchemaListQuery } from '@/modules/projects/hooks/use-project-db-schema'
import type { DbMigration } from '@/shared/contracts/db-migration.contract'

type DbMigrationSectionProps = {
  projectId: string
}

export function DbMigrationSection({ projectId }: DbMigrationSectionProps) {
  const [open, setOpen] = useState(false)
  const [selectedDbSchemaId, setSelectedDbSchemaId] = useState('')
  const [generated, setGenerated] = useState<DbMigration | null>(null)

  const listQuery = useDbMigrationListQuery(projectId)
  const schemasQuery = useProjectDbSchemaListQuery(projectId)
  const generateMutation = useGenerateDbMigrationMutation(projectId)

  const tableSchemas = (schemasQuery.data ?? []).filter((s) => s.objectType === 'table')

  const handleGenerate = () => {
    generateMutation.mutate(
      { dbSchemaId: selectedDbSchemaId || undefined },
      {
        onSuccess: (migration) => {
          setGenerated(migration)
        },
      },
    )
  }

  const handleOpen = () => {
    setGenerated(null)
    setSelectedDbSchemaId('')
    setOpen(true)
  }

  const migrations = listQuery.data ?? []

  return (
    <Card className="bg-white">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">迁移生成</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
          <Terminal className="mr-1.5 h-4 w-4" />
          生成迁移 SQL
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">时间</TableHead>
                <TableHead className="w-28">状态</TableHead>
                <TableHead>模型</TableHead>
                <TableHead className="w-20">行数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                    加载中…
                  </TableCell>
                </TableRow>
              ) : migrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                    暂无迁移记录。
                  </TableCell>
                </TableRow>
              ) : (
                migrations.map((migration) => (
                  <TableRow key={migration.id}>
                    <TableCell className="text-xs text-slate-600">
                      {new Date(migration.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          migration.status === 'applied'
                            ? 'bg-green-100 text-green-700'
                            : migration.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {migration.status === 'draft' ? '草稿' : migration.status === 'applied' ? '已应用' : '失败'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {migration.dbSchemaId ? '单个模型' : '全部表'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {migration.sql.split('\n').filter((line) => line.trim().endsWith(';')).length}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader className="border-b border-slate-200 px-4 py-3">
              <DialogTitle className="text-sm">生成迁移 SQL（Dry-run）</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-700">目标模型</label>
                <Select value={selectedDbSchemaId} onValueChange={setSelectedDbSchemaId}>
                  <SelectTrigger className="h-8 w-64">
                    <SelectValue placeholder="全部表（默认）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部表</SelectItem>
                    {tableSchemas.map((schema) => (
                      <SelectItem key={schema.id} value={schema.id}>
                        {schema.schemaName ? `${schema.schemaName}.` : ''}
                        {schema.objectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  disabled={generateMutation.isPending || schemasQuery.isLoading}
                  onClick={handleGenerate}
                >
                  <Play className="mr-1.5 h-4 w-4" />
                  {generateMutation.isPending ? '生成中…' : '生成 SQL'}
                </Button>
              </div>

              {generateMutation.error ? (
                <p className="text-sm text-red-600">
                  {generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : '生成失败'}
                </p>
              ) : null}

              {generated ? (
                <div className="space-y-3">
                  {Array.isArray(generated.generatedFromSnapshot?.warnings) &&
                    generated.generatedFromSnapshot.warnings.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <ul className="list-inside list-disc space-y-1">
                        {(generated.generatedFromSnapshot.warnings as string[]).map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="relative">
                    <pre className="max-h-[360px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed">
                      <code>{generated.sql || '（无差异，无需迁移）'}</code>
                    </pre>
                  </div>
                  <p className="text-xs text-slate-500">
                    迁移已保存为草稿，尚未在数据源执行。如需应用，请复制 SQL 后在数据库客户端执行。
                  </p>
                </div>
              ) : null}
            </div>
            <DialogFooter className="border-t border-slate-200 px-4 py-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
