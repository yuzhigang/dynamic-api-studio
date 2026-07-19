import { Save } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ProjectBasicFields } from '@/modules/projects/components/project-form/project-basic-fields'
import { useSaveProject } from '@/modules/projects/hooks/use-save-project'
import type { Project, ProjectDraft } from '@/shared/contracts/project.contract'

type ProjectSettingsFormProps = {
  project: Project
}

function toDraft(project: Project): ProjectDraft {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    description: project.description ?? '',
    icon: project.icon,
    color: project.color,
  }
}

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  // 草稿仅在挂载时初始化；父组件以 key={project.id} 在切换项目时重挂载。
  const [draft, setDraft] = useState<ProjectDraft>(() => toDraft(project))
  const mutation = useSaveProject()

  const canSave = draft.code.trim().length > 0 && draft.name.trim().length > 0

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate(draft)
      }}
    >
      <ProjectBasicFields value={draft} onChange={setDraft} />
      {mutation.error ? (
        <p className="text-sm text-red-600">
          {mutation.error instanceof Error ? mutation.error.message : '保存失败'}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canSave || mutation.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {mutation.isPending ? '保存中…' : '保存'}
        </Button>
        {mutation.isSuccess ? <span className="text-sm text-emerald-600">已保存</span> : null}
      </div>
    </form>
  )
}
