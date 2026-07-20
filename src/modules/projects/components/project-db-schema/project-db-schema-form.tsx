import { useState } from 'react'

import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import { CompactField } from '@/components/common/compact-field'
import type { ProjectDbSchemaDraft } from '@/shared/contracts/project-db-schema.contract'
import type {
  DataSourceSchemaColumn,
  DataSourceSchemaIndex,
} from '@/shared/contracts/data-source.contract'

const DATA_TYPE_OPTIONS = [
  'varchar',
  'text',
  'integer',
  'bigint',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'timestamp',
  'json',
  'jsonb',
  'uuid',
  'binary',
]

type ProjectDbSchemaFormProps = {
  value: ProjectDbSchemaDraft
  onChange: (value: ProjectDbSchemaDraft) => void
}

export function ProjectDbSchemaForm({ value, onChange }: ProjectDbSchemaFormProps) {
  const [newColumnName, setNewColumnName] = useState('')
  const [newIndexName, setNewIndexName] = useState('')

  const update = (patch: Partial<ProjectDbSchemaDraft>) => {
    onChange({ ...value, ...patch })
  }

  const updateColumn = (index: number, patch: Partial<DataSourceSchemaColumn>) => {
    const next = value.columns.map((col, i) => (i === index ? { ...col, ...patch } : col))
    update({ columns: next })
  }

  const addColumn = () => {
    const name = newColumnName.trim()
    if (!name || value.columns.some((c) => c.name === name)) return
    update({
      columns: [
        ...value.columns,
        {
          name,
          dataType: 'varchar',
          nullable: true,
          isPrimaryKey: false,
        },
      ],
    })
    setNewColumnName('')
  }

  const removeColumn = (index: number) => {
    const removedName = value.columns[index]?.name
    const nextColumns = value.columns.filter((_, i) => i !== index)
    const nextIndexes = (value.indexes ?? []).map((idx) => ({
      ...idx,
      columns: idx.columns.filter((c) => c !== removedName),
    })).filter((idx) => idx.columns.length > 0)
    update({ columns: nextColumns, indexes: nextIndexes })
  }

  const addIndex = () => {
    const name = newIndexName.trim()
    if (!name || (value.indexes ?? []).some((idx) => idx.name === name)) return
    update({
      indexes: [
        ...(value.indexes ?? []),
        { name, columns: [], unique: false, primary: false },
      ],
    })
    setNewIndexName('')
  }

  const updateIndex = (index: number, patch: Partial<DataSourceSchemaIndex>) => {
    const next = (value.indexes ?? []).map((idx, i) => (i === index ? { ...idx, ...patch } : idx))
    update({ indexes: next })
  }

  const removeIndex = (index: number) => {
    const next = (value.indexes ?? []).filter((_, i) => i !== index)
    update({ indexes: next })
  }

  const toggleIndexColumn = (index: number, columnName: string) => {
    const idx = value.indexes?.[index]
    if (!idx) return
    const has = idx.columns.includes(columnName)
    updateColumnInIndex(index, {
      columns: has ? idx.columns.filter((c) => c !== columnName) : [...idx.columns, columnName],
    })
  }

  const updateColumnInIndex = (index: number, patch: Partial<DataSourceSchemaIndex>) => {
    const next = (value.indexes ?? []).map((idx, i) => (i === index ? { ...idx, ...patch } : idx))
    update({ indexes: next })
  }

  return (
    <div className="space-y-5">
      <CompactField htmlFor="db-schema-name" label="对象名" required>
        <Input
          id="db-schema-name"
          value={value.objectName}
          placeholder="例如 users"
          onChange={(event) => update({ objectName: event.target.value })}
        />
      </CompactField>

      <CompactField htmlFor="db-schema-type" label="类型" required>
        <Select value={value.objectType} onValueChange={(next) => update({ objectType: next as ProjectDbSchemaDraft['objectType'] })}>
          <SelectTrigger id="db-schema-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="table">表</SelectItem>
            <SelectItem value="view">视图</SelectItem>
          </SelectContent>
        </Select>
      </CompactField>

      <CompactField htmlFor="db-schema-schema" label="Schema">
        <Input
          id="db-schema-schema"
          value={value.schemaName ?? ''}
          placeholder="例如 public（可选）"
          onChange={(event) => update({ schemaName: event.target.value || undefined })}
        />
      </CompactField>

      <CompactField htmlFor="db-schema-comment" label="备注">
        <Textarea
          id="db-schema-comment"
          value={value.comment ?? ''}
          placeholder="描述该数据模型用途"
          onChange={(event) => update({ comment: event.target.value || undefined })}
        />
      </CompactField>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">列</h4>
          <div className="flex items-center gap-2">
            <Input
              className="h-8 w-40"
              placeholder="列名"
              value={newColumnName}
              onChange={(event) => setNewColumnName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addColumn()
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addColumn}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              添加列
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">列名</TableHead>
                <TableHead className="w-28">类型</TableHead>
                <TableHead className="w-16">长度</TableHead>
                <TableHead className="w-16">精度</TableHead>
                <TableHead className="w-16">标度</TableHead>
                <TableHead className="w-20">可空</TableHead>
                <TableHead className="w-16">主键</TableHead>
                <TableHead className="w-16">自增</TableHead>
                <TableHead>默认值</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.columns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-slate-500">
                    暂无列，请在上方添加。
                  </TableCell>
                </TableRow>
              ) : (
                value.columns.map((column, index) => (
                  <TableRow key={column.name}>
                    <TableCell>
                      <Input
                        className="h-8"
                        value={column.name}
                        onChange={(event) => updateColumn(index, { name: event.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={column.dataType}
                        onValueChange={(next) => updateColumn(index, { dataType: next })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8"
                        value={column.length ?? ''}
                        onChange={(event) =>
                          updateColumn(index, {
                            length: event.target.value === '' ? null : Number(event.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8"
                        value={column.precision ?? ''}
                        onChange={(event) =>
                          updateColumn(index, {
                            precision: event.target.value === '' ? null : Number(event.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8"
                        value={column.scale ?? ''}
                        onChange={(event) =>
                          updateColumn(index, {
                            scale: event.target.value === '' ? null : Number(event.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={column.nullable}
                        onCheckedChange={(checked) => updateColumn(index, { nullable: checked === true })}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={column.isPrimaryKey}
                        onCheckedChange={(checked) =>
                          updateColumn(index, { isPrimaryKey: checked === true })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={column.autoIncrement ?? false}
                        onCheckedChange={(checked) =>
                          updateColumn(index, { autoIncrement: checked === true })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        value={column.defaultValue ?? ''}
                        placeholder="NULL"
                        onChange={(event) =>
                          updateColumn(index, {
                            defaultValue: event.target.value === '' ? null : event.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-red-600"
                        onClick={() => removeColumn(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">索引</h4>
          <div className="flex items-center gap-2">
            <Input
              className="h-8 w-40"
              placeholder="索引名"
              value={newIndexName}
              onChange={(event) => setNewIndexName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addIndex()
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addIndex}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              添加索引
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">索引名</TableHead>
                <TableHead>列</TableHead>
                <TableHead className="w-20">唯一</TableHead>
                <TableHead className="w-20">主键</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(value.indexes ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                    暂无索引。
                  </TableCell>
                </TableRow>
              ) : (
                (value.indexes ?? []).map((index, indexIdx) => (
                  <TableRow key={index.name}>
                    <TableCell>
                      <Input
                        className="h-8"
                        value={index.name}
                        onChange={(event) => updateIndex(indexIdx, { name: event.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {value.columns.map((column) => (
                          <label
                            key={column.name}
                            className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs"
                          >
                            <Checkbox
                              checked={index.columns.includes(column.name)}
                              onCheckedChange={() => toggleIndexColumn(indexIdx, column.name)}
                            />
                            {column.name}
                          </label>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={index.unique}
                        onCheckedChange={(checked) =>
                          updateIndex(indexIdx, { unique: checked === true })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={index.primary}
                        onCheckedChange={(checked) =>
                          updateIndex(indexIdx, { primary: checked === true })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-red-600"
                        onClick={() => removeIndex(indexIdx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
