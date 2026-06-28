import type { Variable, VariableDraft } from '@/shared/contracts/variable.contract'
import { filterEmptyItems } from '@/modules/variables/utils/string-list'

export function createEmptyVariableDraft(): VariableDraft {
  return { name: '', label: '', kind: 'single', value: '', items: [] }
}

export function toVariableDraft(variable: Variable): VariableDraft {
  return {
    id: variable.id,
    name: variable.name,
    label: variable.label,
    kind: variable.kind,
    value: variable.value,
    items: variable.items,
  }
}

export function normalizeVariableDraft(draft: VariableDraft): VariableDraft {
  return draft.kind === 'list'
    ? { ...draft, value: '', items: filterEmptyItems(draft.items) }
    : { ...draft, items: [] }
}
