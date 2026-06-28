import type {
  ProjectVariable,
  ProjectVariableDraft,
} from '@/shared/contracts/project-variable.contract'

const now = '2026-06-28T00:00:00.000Z'

const seedProjectVariables: ProjectVariable[] = [
  {
    id: 'pv_order_region',
    projectId: 'project_order',
    name: 'region',
    label: '区域',
    kind: 'single',
    value: 'CN',
    items: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'pv_order_channels',
    projectId: 'project_order',
    name: 'channels',
    label: '渠道',
    kind: 'list',
    value: '',
    items: ['web', 'app', 'pos'],
    createdAt: now,
    updatedAt: now,
  },
]

export class ProjectVariableRepository {
  private variables = new Map(seedProjectVariables.map((variable) => [variable.id, variable]))

  list(projectId: string) {
    return Array.from(this.variables.values()).filter((variable) => variable.projectId === projectId)
  }

  get(variableId: string) {
    return this.variables.get(variableId)
  }

  save(projectId: string, draft: ProjectVariableDraft) {
    const timestamp = new Date().toISOString()
    const id = draft.id ?? `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const duplicate = Array.from(this.variables.values()).find(
      (variable) =>
        variable.projectId === projectId && variable.name === draft.name && variable.id !== id,
    )

    if (duplicate) {
      throw new Error(`变量名「${draft.name}」已存在`)
    }

    const existing = this.variables.get(id)
    const variable: ProjectVariable = {
      id,
      projectId,
      name: draft.name,
      label: draft.label,
      kind: draft.kind,
      value: draft.kind === 'single' ? draft.value : '',
      items: draft.kind === 'list' ? draft.items : [],
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    this.variables.set(id, variable)
    return variable
  }

  remove(variableId: string) {
    return this.variables.delete(variableId)
  }
}
