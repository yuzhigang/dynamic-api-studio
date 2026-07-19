import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CompactField } from '@/components/common/compact-field'
import { ProjectAppearanceFields } from '@/modules/projects/components/project-form/project-appearance-fields'
import { useDataSourceListQuery } from '@/modules/data-source/hooks/use-data-source-query'
import type { ProjectDraft } from '@/shared/contracts/project.contract'

type ProjectBasicFieldsProps = {
  value: ProjectDraft
  onChange: (value: ProjectDraft) => void
}

export function ProjectBasicFields({ value, onChange }: ProjectBasicFieldsProps) {
  const dataSourcesQuery = useDataSourceListQuery()
  const dataSources = dataSourcesQuery.data ?? []

  return (
    <div className="space-y-4">
      <CompactField htmlFor="project-code" label="项目编码" required>
        <Input
          id="project-code"
          name="projectCode"
          autoComplete="off"
          value={value.code}
          placeholder="例如 ORDER…"
          onChange={(event) => onChange({ ...value, code: event.target.value })}
        />
      </CompactField>
      <CompactField htmlFor="project-name" label="项目名称" required>
        <Input
          id="project-name"
          name="projectName"
          autoComplete="off"
          value={value.name}
          placeholder="例如 订单中心…"
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </CompactField>
      <CompactField htmlFor="project-description" label="描述">
        <Textarea
          id="project-description"
          name="projectDescription"
          autoComplete="off"
          value={value.description ?? ''}
          placeholder="例如项目用途和维护范围…"
          onChange={(event) => onChange({ ...value, description: event.target.value })}
        />
      </CompactField>
      <CompactField htmlFor="project-datasource" label="业务数据源">
        <Select
          value={value.dbSourceId ?? ''}
          onValueChange={(next) =>
            onChange({ ...value, dbSourceId: next ? next : undefined })
          }
          disabled={dataSourcesQuery.isLoading}
        >
          <SelectTrigger id="project-datasource">
            <SelectValue placeholder="选择项目关联的数据源（可选）" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">暂不关联</SelectItem>
            {dataSources.map((ds) => (
              <SelectItem key={ds.id} value={ds.id}>
                {ds.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CompactField>
      <ProjectAppearanceFields value={value} onChange={onChange} />
    </div>
  )
}
