import type { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import type { ProjectVariableDraft } from '@/shared/contracts/project-variable.contract'

export class ProjectVariableService {
  constructor(private readonly repository: ProjectVariableRepository) {}

  list(projectId: string) {
    return this.repository.list(projectId)
  }

  get(variableId: string) {
    return this.repository.get(variableId)
  }

  save(projectId: string, draft: ProjectVariableDraft) {
    return this.repository.save(projectId, draft)
  }

  remove(variableId: string) {
    return this.repository.remove(variableId)
  }
}
