import type { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import type { GlobalVariableDraft } from '@/shared/contracts/global-variable.contract'

export class GlobalVariableService {
  constructor(private readonly repository: GlobalVariableRepository) {}

  list() {
    return this.repository.list()
  }

  get(variableId: string) {
    return this.repository.get(variableId)
  }

  save(draft: GlobalVariableDraft) {
    return this.repository.save(draft)
  }

  remove(variableId: string) {
    return this.repository.remove(variableId)
  }
}
