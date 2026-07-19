import type { ApiDefinitionDraft, RequestParam } from '@/shared/contracts/api-definition.contract'
import type { GenerateCrudOptions, GenerateCrudResult } from '@/shared/contracts/crud-generation.contract'
import type { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import type { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import type { JsonSchemaRepository } from '@/server/domains/json-schema/json-schema.repository'
import type { ProjectDbSchemaRepository } from '@/server/domains/project-db-schema/project-db-schema.repository'
import type { ProjectRepository } from '@/server/domains/project/project.repository'
import {
  buildEntityJsonSchema,
  buildEntityResponseSchemaFields,
  buildListResponseSchemaFields,
  buildRequestParamsFromColumns,
} from '@/server/domains/crud-generator/crud-schema-builder'
import {
  buildCreateOperation,
  buildDeleteOperation,
  buildListOperation,
  buildReadOperation,
  buildUpdateOperation,
  type CrudOperation,
} from '@/server/domains/crud-generator/crud-sql-builder'
import type { DataSourceSchemaColumn } from '@/shared/schemas/data-source.schema'
import type { Dialect } from '@/shared/schemas/data-source.schema'

export class CrudGeneratorService {
  constructor(
    private readonly projectDbSchemaRepository: ProjectDbSchemaRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly jsonSchemaRepository: JsonSchemaRepository,
    private readonly apiDefinitionRepository: ApiDefinitionRepository,
  ) {}

  async generate(
    projectId: string,
    dbSchemaId: string,
    options: GenerateCrudOptions = {},
  ): Promise<GenerateCrudResult> {
    const project = await this.projectRepository.get(projectId)
    if (!project) {
      throw new Error('项目不存在')
    }
    if (!project.dbSourceId) {
      throw new Error('项目未关联数据源')
    }

    const dbSchema = await this.projectDbSchemaRepository.get(projectId, dbSchemaId)
    if (!dbSchema) {
      throw new Error('数据模型不存在')
    }

    const dataSource = await this.dataSourceRepository.get(project.dbSourceId)
    if (!dataSource) {
      throw new Error('数据源不存在')
    }

    const dialect = dataSource.dialect as Dialect
    const pkColumns = resolvePrimaryKeyColumns(dbSchema.columns)
    if (pkColumns.length === 0) {
      throw new Error('数据模型缺少可用主键列')
    }

    const entitySchema = buildEntityJsonSchema(dbSchema.objectName, dbSchema.columns, dbSchema.comment)
    const { id: jsonSchemaId } = await this.jsonSchemaRepository.save({
      projectId,
      name: `${dbSchema.objectName}Schema`,
      kind: 'response',
      content: entitySchema,
      description: dbSchema.comment,
    })

    const rowResponseFields = buildEntityResponseSchemaFields(dbSchema.columns)
    const listResponseFields = buildListResponseSchemaFields(rowResponseFields)

    const status = options.status ?? 'draft'
    const pathPrefix = options.pathPrefix

    const operations: CrudOperation[] = [
      buildListOperation(dbSchema.schemaName, dbSchema.objectName, dbSchema.columns, pkColumns, dialect, pathPrefix),
      buildCreateOperation(dbSchema.schemaName, dbSchema.objectName, dbSchema.columns, pkColumns, dialect, pathPrefix),
      buildReadOperation(dbSchema.schemaName, dbSchema.objectName, dbSchema.columns, pkColumns, dialect, pathPrefix),
      buildUpdateOperation(dbSchema.schemaName, dbSchema.objectName, dbSchema.columns, pkColumns, dialect, pathPrefix),
      buildDeleteOperation(dbSchema.schemaName, dbSchema.objectName, dbSchema.columns, pkColumns, dialect, pathPrefix),
    ]

    for (const operation of operations) {
      const exists = await this.apiDefinitionRepository.existsByPathMethod(
        projectId,
        operation.path,
        operation.method,
      )
      if (exists) {
        throw new Error(`path+method 冲突：${operation.method} ${operation.path}`)
      }
    }

    const apiIds: string[] = []
    for (const operation of operations) {
      const draft = buildApiDefinitionDraft({
        projectId,
        status,
        responseSchemaId: jsonSchemaId,
        datasourceId: project.dbSourceId,
        operation,
        columns: dbSchema.columns,
        rowResponseFields,
        listResponseFields,
        pkColumns,
      })
      const saved = await this.apiDefinitionRepository.save(projectId, draft)
      apiIds.push(saved.id)
    }

    return { jsonSchemaId, apiIds }
  }
}

function resolvePrimaryKeyColumns(columns: DataSourceSchemaColumn[]): DataSourceSchemaColumn[] {
  const pks = columns.filter((c) => c.isPrimaryKey)
  if (pks.length > 0) return pks
  return columns.length > 0 ? [columns[0]] : []
}

type BuildDraftOptions = {
  projectId: string
  status: ApiDefinitionDraft['status']
  responseSchemaId: string
  datasourceId: string
  operation: CrudOperation
  columns: DataSourceSchemaColumn[]
  rowResponseFields: ReturnType<typeof buildEntityResponseSchemaFields>
  listResponseFields: ReturnType<typeof buildListResponseSchemaFields>
  pkColumns: DataSourceSchemaColumn[]
}

function buildApiDefinitionDraft(options: BuildDraftOptions): ApiDefinitionDraft {
  const { projectId, status, responseSchemaId, datasourceId, operation, columns, rowResponseFields, listResponseFields, pkColumns } =
    options

  const stepsWithDatasource = operation.steps.map((step) => ({
    ...step,
    datasourceId,
  }))

  const isList = operation.method === 'GET' && operation.path.endsWith('/list')

  return {
    projectId,
    status,
    name: operation.name,
    path: operation.path,
    method: operation.method,
    tags: ['crud', 'generated'],
    permissions: [],
    requireAuth: true,
    description: `由数据模型自动生成：${operation.path}`,
    bodyContentType: 'json',
    responseSchemaId,
    requestParams: buildRequestParams(operation, columns, pkColumns),
    responseSchema: isList ? listResponseFields : rowResponseFields,
    localVariables: [],
    workflowSteps: stepsWithDatasource,
  }
}

function buildRequestParams(
  operation: CrudOperation,
  columns: DataSourceSchemaColumn[],
  pkColumns: DataSourceSchemaColumn[],
): RequestParam[] {
  const isList = operation.method === 'GET' && operation.path.endsWith('/list')

  if (isList) {
    return [
      { id: 'param_pageNo', name: 'pageNo', location: 'query', type: 'integer', required: true, example: '1' },
      { id: 'param_pageSize', name: 'pageSize', location: 'query', type: 'integer', required: true, example: '20' },
      ...buildRequestParamsFromColumns(
        columns,
        'query',
        () => true,
        () => false,
      ),
    ]
  }

  if (operation.method === 'GET' || operation.method === 'DELETE') {
    return buildRequestParamsFromColumns(pkColumns, 'query', () => true, () => true)
  }

  if (operation.method === 'POST') {
    // Create：排除自增主键；非空且无默认值则必填
    return buildRequestParamsFromColumns(
      columns.filter((c) => !c.autoIncrement),
      'body',
      () => true,
      (c) => !c.nullable && c.defaultValue === null,
    )
  }

  // PUT Update：全部字段放 body，主键必填、非主键可选
  return buildRequestParamsFromColumns(
    columns,
    'body',
    () => true,
    (c) => pkColumns.some((pk) => pk.name === c.name),
  )
}
