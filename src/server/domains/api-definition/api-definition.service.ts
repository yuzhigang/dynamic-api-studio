import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

import type { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'

export class ApiDefinitionService {
  constructor(private readonly repository: ApiDefinitionRepository) {}

  list(projectId: string) {
    return this.repository.list(projectId)
  }

  get(projectId: string, apiId: string) {
    return this.repository.get(projectId, apiId)
  }

  save(projectId: string, draft: ApiDefinitionDraft) {
    return this.repository.save(projectId, draft)
  }
}