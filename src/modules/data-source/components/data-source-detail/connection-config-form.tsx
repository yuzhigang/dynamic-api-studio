import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CompactField } from '@/components/common/compact-field'
import { DialectIcon } from '@/modules/data-source/components/common/dialect-icon'
import { useSaveDataSource } from '@/modules/data-source/hooks/use-save-data-source'
import { useTestConnection } from '@/modules/data-source/hooks/use-test-connection'
import { defaultPortFor, dialectOptions } from '@/modules/data-source/model/dialect'
import { toDraft } from '@/modules/data-source/utils/data-source-draft'
import type { DataSource, Dialect } from '@/shared/contracts/data-source.contract'

type ConnectionConfigFormProps = {
  dataSource: DataSource
}

export function ConnectionConfigForm({ dataSource }: ConnectionConfigFormProps) {
  const [draft, setDraft] = useState(() => toDraft(dataSource))
  const saveDataSource = useSaveDataSource()
  const testConnection = useTestConnection()

  useEffect(() => {
    setDraft(toDraft(dataSource))
    testConnection.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource.id])

  const handleDialectChange = (dialect: Dialect) => {
    setDraft((current) => ({ ...current, dialect, port: defaultPortFor(dialect) }))
    testConnection.reset()
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    saveDataSource.mutate(draft)
  }

  const result = testConnection.data

  return (
    <form className="max-w-2xl space-y-4" onSubmit={handleSubmit}>
      <CompactField htmlFor="ds-name" label="名称" required>
        <Input
          id="ds-name"
          autoComplete="off"
          value={draft.name}
          placeholder="例如 订单库…"
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </CompactField>
      <CompactField htmlFor="ds-dialect" label="方言" required>
        <Select value={draft.dialect} onValueChange={(value) => handleDialectChange(value as Dialect)}>
          <SelectTrigger id="ds-dialect">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dialectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <DialectIcon dialect={option.value} />
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CompactField>
      <div className="grid grid-cols-[86px_minmax(0,1fr)] items-start gap-3">
        <div />
        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="ds-host">
              主机地址
            </label>
            <Input
              id="ds-host"
              autoComplete="off"
              value={draft.host}
              placeholder="10.10.0.21"
              onChange={(event) => setDraft({ ...draft, host: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="ds-port">
              端口
            </label>
            <Input
              id="ds-port"
              type="number"
              autoComplete="off"
              value={draft.port}
              onChange={(event) =>
                setDraft({ ...draft, port: Number(event.target.value) || 0 })
              }
            />
          </div>
        </div>
      </div>
      <CompactField htmlFor="ds-database" label="数据库">
        <Input
          id="ds-database"
          autoComplete="off"
          value={draft.database}
          placeholder="例如 ORCLPDB1…"
          onChange={(event) => setDraft({ ...draft, database: event.target.value })}
        />
      </CompactField>
      <CompactField htmlFor="ds-username" label="用户名">
        <Input
          id="ds-username"
          autoComplete="off"
          value={draft.username}
          onChange={(event) => setDraft({ ...draft, username: event.target.value })}
        />
      </CompactField>
      <CompactField htmlFor="ds-password" label="密码">
        <Input
          id="ds-password"
          type="password"
          autoComplete="new-password"
          value={draft.password}
          onChange={(event) => setDraft({ ...draft, password: event.target.value })}
        />
      </CompactField>
      <CompactField htmlFor="ds-description" label="描述">
        <Textarea
          id="ds-description"
          autoComplete="off"
          value={draft.description ?? ''}
          placeholder="例如数据源用途…"
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </CompactField>

      {result ? (
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            result.success
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span>
            {result.message}
            <span className="ml-1 text-xs opacity-70">（{result.latencyMs}ms）</span>
          </span>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          disabled={testConnection.isPending}
          onClick={() => testConnection.mutate(draft)}
        >
          {testConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          测试连接
        </Button>
        <Button type="submit" disabled={saveDataSource.isPending}>
          {saveDataSource.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          保存
        </Button>
      </div>
    </form>
  )
}
