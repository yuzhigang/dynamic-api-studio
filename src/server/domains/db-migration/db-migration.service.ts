import type { KnexRegistry } from '@/server/infra/knex/knex-registry'
import type { DbMigrationRepository } from '@/server/domains/db-migration/db-migration.repository'
import type { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import type { DataSourceSchemaService } from '@/server/domains/data-source/data-source-schema.service'
import type { ProjectRepository } from '@/server/domains/project/project.repository'
import type { ProjectDbSchemaRepository } from '@/server/domains/project-db-schema/project-db-schema.repository'
import { generateMigrationSql } from '@/server/domains/db-migration/migration-sql-generator'
import { toKnexConfig } from '@/server/workflow/datasource-config'
import type {
  DbMigration,
  GenerateMigrationRequest,
} from '@/shared/contracts/db-migration.contract'
import type { ProjectDbSchema } from '@/shared/contracts/project-db-schema.contract'

export class DbMigrationService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly dataSourceSchemaService: DataSourceSchemaService,
    private readonly projectDbSchemaRepository: ProjectDbSchemaRepository,
    private readonly dbMigrationRepository: DbMigrationRepository,
    private readonly knexRegistry: KnexRegistry,
  ) {}

  async generateMigration(
    projectId: string,
    request: GenerateMigrationRequest,
  ): Promise<DbMigration> {
    const project = await this.projectRepository.get(projectId)
    if (!project) {
      throw new Error('项目不存在')
    }
    if (!project.dbSourceId) {
      throw new Error('项目未关联数据源')
    }

    const dataSource = await this.dataSourceRepository.get(project.dbSourceId)
    if (!dataSource) {
      throw new Error('数据源不存在')
    }

    const desiredSchemas = await this.getDesiredSchemas(projectId, request.dbSchemaId)
    if (desiredSchemas.length === 0) {
      throw new Error('没有可生成迁移的数据模型')
    }

    const actualSchema = await this.dataSourceSchemaService.getDataSourceSchema(dataSource.id)

    const knex = this.knexRegistry.getOrCreate(toKnexConfig(dataSource))
    const { sql, warnings } = generateMigrationSql({
      desired: desiredSchemas,
      actual: actualSchema.tables,
      dialect: dataSource.dialect,
      knex,
    })

    return this.dbMigrationRepository.create({
      projectId,
      dbSchemaId: request.dbSchemaId,
      sql,
      generatedFromSnapshot: {
        desiredSchemas: desiredSchemas.map((s) => s.id),
        actualTableNames: actualSchema.tables.map((t) => t.name),
        dialect: dataSource.dialect,
        warnings,
      },
    })
  }

  private async getDesiredSchemas(projectId: string, dbSchemaId?: string): Promise<ProjectDbSchema[]> {
    if (dbSchemaId) {
      const schema = await this.projectDbSchemaRepository.get(projectId, dbSchemaId)
      return schema ? [schema] : []
    }

    const all = await this.projectDbSchemaRepository.listByProject(projectId)
    return all.filter((s) => s.objectType === 'table')
  }
}
