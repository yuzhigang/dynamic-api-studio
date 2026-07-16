import type { ProjectRepository } from '@/server/domains/project/project.repository'
import type { ProjectDraft } from '@/shared/contracts/project.contract'

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  list() {
    return this.repository.list()
  }

  get(projectId: string) {
    return this.repository.get(projectId)
  }

  save(draft: ProjectDraft) {
    return this.repository.save(draft)
  }

  archive(projectId: string) {
    return this.repository.archive(projectId)
  }

  copy(projectId: string) {
    return this.repository.copy(projectId)
  }
}