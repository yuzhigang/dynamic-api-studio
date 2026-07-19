import type { CustomFunctionRepository } from '@/server/domains/custom-function/custom-function.repository'
import type { CustomFunctionDraft } from '@/shared/contracts/custom-function.contract'

export class CustomFunctionService {
  constructor(private readonly repository: CustomFunctionRepository) {}

  listByProject(projectId: string) {
    return this.repository.listByProject(projectId)
  }

  listGlobal() {
    return this.repository.listGlobal()
  }

  get(functionId: string) {
    return this.repository.get(functionId)
  }

  save(projectId: string | undefined, draft: CustomFunctionDraft) {
    return this.repository.save(projectId, draft)
  }

  remove(functionId: string) {
    return this.repository.remove(functionId)
  }
}
