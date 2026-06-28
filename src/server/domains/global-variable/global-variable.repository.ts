import type {
  GlobalVariable,
  GlobalVariableDraft,
} from '@/shared/contracts/global-variable.contract'

const now = '2026-06-28T00:00:00.000Z'

const seedGlobalVariables: GlobalVariable[] = [
  {
    id: 'gv_default_page_size',
    name: 'default_page_size',
    label: '默认分页大小',
    kind: 'single',
    value: '20',
    items: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'gv_valid_order_status',
    name: 'valid_order_status',
    label: '有效订单状态',
    kind: 'list',
    value: '',
    items: ['active', 'frozen', 'closed'],
    createdAt: now,
    updatedAt: now,
  },
]

export class GlobalVariableRepository {
  private variables = new Map(seedGlobalVariables.map((variable) => [variable.id, variable]))

  list() {
    return Array.from(this.variables.values())
  }

  get(variableId: string) {
    return this.variables.get(variableId)
  }

  save(draft: GlobalVariableDraft) {
    const timestamp = new Date().toISOString()
    const id = draft.id ?? `gv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const duplicate = Array.from(this.variables.values()).find(
      (variable) => variable.name === draft.name && variable.id !== id,
    )

    if (duplicate) {
      throw new Error(`变量名「${draft.name}」已存在`)
    }

    const existing = this.variables.get(id)
    const variable: GlobalVariable = {
      id,
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
