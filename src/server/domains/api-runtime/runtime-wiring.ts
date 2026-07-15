import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'
import { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import { rebuildPublishedRouter } from '@/server/domains/api-runtime/published-router'

export const apiDefinitionRepository = new ApiDefinitionRepository()
export const dataSourceRepository = new DataSourceRepository()

export const runtimeDeps = {
  knexRegistry: new KnexRegistry(),
  getDataSource: (id: string) => dataSourceRepository.get(id),
  analyzer: new EnhancedSqlAnalyzer(),
} as const

export const runtimeServices = {
  globalVariableService: new GlobalVariableService(new GlobalVariableRepository()),
  projectVariableService: new ProjectVariableService(new ProjectVariableRepository()),
} as const

/** Build the initial published router from seed data. Call once at server startup. */
export function initPublishedRuntime(): void {
  rebuildPublishedRouter(runtimeDeps, runtimeServices, apiDefinitionRepository)
}