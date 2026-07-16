import type { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import type { DataSourceDraft } from '@/shared/contracts/data-source.contract'

export class DataSourceService {
  constructor(private readonly repository: DataSourceRepository) {}

  list() {
    return this.repository.list()
  }

  get(dataSourceId: string) {
    return this.repository.get(dataSourceId)
  }

  save(draft: DataSourceDraft) {
    return this.repository.save(draft)
  }

  remove(dataSourceId: string) {
    return this.repository.remove(dataSourceId)
  }

  testConnection(draft: DataSourceDraft) {
    return this.repository.testConnection(draft)
  }
}