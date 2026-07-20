import type { ProjectDbSchemaRepository } from '@/server/domains/project-db-schema/project-db-schema.repository'
import type { DataSourceSchemaService } from '@/server/domains/data-source/data-source-schema.service'
import type { ProjectRepository } from '@/server/domains/project/project.repository'
import type {
  ProjectDbSchemaDraft,
  SyncProjectDbSchemaFromSource,
} from '@/shared/contracts/project-db-schema.contract'

export class ProjectDbSchemaService {
  constructor(
    private readonly repository: ProjectDbSchemaRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly dataSourceSchemaService: DataSourceSchemaService,
  ) {}

  async listByProject(projectId: string) {
    return this.repository.listByProject(projectId)
  }

  async get(projectId: string, dbSchemaId: string) {
    return this.repository.get(projectId, dbSchemaId)
  }

  async save(projectId: string, draft: ProjectDbSchemaDraft) {
    const project = await this.projectRepository.get(projectId)
    if (!project) {
      throw new Error('项目不存在')
    }
    return this.repository.save(projectId, draft)
  }

  async getSourceObjects(projectId: string) {
    const project = await this.projectRepository.get(projectId)
    if (!project) {
      throw new Error('项目不存在')
    }
    if (!project.dbSourceId) {
      return { available: false, reason: '项目未关联数据源', objects: [] as const }
    }

    const schema = await this.dataSourceSchemaService.getDataSourceSchema(project.dbSourceId)
    return {
      available: true,
      dbSourceId: project.dbSourceId,
      objects: schema.tables,
    }
  }

  async syncFromSource(projectId: string, payload: SyncProjectDbSchemaFromSource) {
    const project = await this.projectRepository.get(projectId)
    if (!project) {
      throw new Error('项目不存在')
    }
    if (!project.dbSourceId) {
      throw new Error('项目未关联数据源')
    }

    const schema = await this.dataSourceSchemaService.getDataSourceSchema(project.dbSourceId)
    const sourceObjects = schema.tables // table/view 都允许

    return this.repository.syncFromSource(projectId, project.dbSourceId, payload, sourceObjects)
  }

  async delete(projectId: string, dbSchemaId: string) {
    return this.repository.delete(projectId, dbSchemaId)
  }
}
