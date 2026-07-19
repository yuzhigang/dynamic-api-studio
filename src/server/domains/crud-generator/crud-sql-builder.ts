import type { DataSourceSchemaColumn } from '@/shared/schemas/data-source.schema'
import type { Dialect } from '@/shared/schemas/data-source.schema'
import type { RequestParam, SchemaField, WorkflowStep } from '@/shared/schemas/api-definition.schema'
import { createId } from '@/lib/id'

export type CrudOperation = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  name: string
  requestParams: RequestParam[]
  responseSchema: SchemaField[]
  steps: WorkflowStep[]
}

function buildTableRef(schemaName: string | null | undefined, objectName: string): string {
  return schemaName ? `${schemaName}.${objectName}` : objectName
}

function quoteIdentifier(name: string): string {
  // 保持简单：不 wrapped；假定 object/column 名为合法标识符。
  // 后续若需跨方言引号，可在此扩展。
  return name
}

function columnList(columns: DataSourceSchemaColumn[]): string {
  return columns.map((c) => quoteIdentifier(c.name)).join(', ')
}

function pkWhereClause(pkColumns: DataSourceSchemaColumn[]): string {
  return pkColumns
    .map((c) => `${quoteIdentifier(c.name)} = $input.${c.name}`)
    .join(' AND ')
}

function filterWhereClause(
  columns: DataSourceSchemaColumn[],
  excludeColumns?: string[],
): string {
  const filtered = columns.filter((c) => !excludeColumns?.includes(c.name))
  if (filtered.length === 0) return ''
  return (
    ' AND ' +
    filtered
      .map((c) => `${quoteIdentifier(c.name)} = $input.${c.name}?`)
      .join(' AND ')
  )
}

function orderByPkClause(pkColumns: DataSourceSchemaColumn[]): string {
  if (pkColumns.length === 0) return ''
  return ` ORDER BY ${pkColumns.map((c) => quoteIdentifier(c.name)).join(', ')} DESC`
}

function paginationClause(dialect: Dialect): string {
  // PostgreSQL / MySQL / SQLite 通用 LIMIT/OFFSET
  // SQL Server 需 OFFSET/FETCH，Oracle 需 ROWNUM/ROW_LIMITING；先聚焦主流方言。
  if (dialect === 'sqlserver') {
    return ' ORDER BY (SELECT NULL) OFFSET ($input.pageNo - 1) * $input.pageSize ROWS FETCH NEXT $input.pageSize ROWS ONLY'
  }
  return ' LIMIT $input.pageSize OFFSET ($input.pageNo - 1) * $input.pageSize'
}

function supportsReturning(dialect: Dialect): boolean {
  return dialect === 'postgresql' || dialect === 'sqlserver'
}

export function buildListOperation(
  schemaName: string | null | undefined,
  objectName: string,
  columns: DataSourceSchemaColumn[],
  pkColumns: DataSourceSchemaColumn[],
  dialect: Dialect,
  pathPrefix?: string,
): CrudOperation {
  const tableRef = buildTableRef(schemaName, objectName)
  const basePath = pathPrefix ? `/${pathPrefix}` : ''
  const filters = filterWhereClause(columns)
  const orderBy = orderByPkClause(pkColumns)
  const countSql = `SELECT COUNT(*) AS total FROM ${tableRef} WHERE 1=1${filters}`
  const selectSql = `SELECT * FROM ${tableRef} WHERE 1=1${filters}${orderBy}${paginationClause(dialect)}`

  const countStepId = createId('step')
  const selectStepId = createId('step')

  return {
    method: 'GET',
    path: `${basePath}/crud/${objectName}/list`,
    name: `${objectName} 列表`,
    requestParams: [],
    responseSchema: [],
    steps: [
      {
        id: countStepId,
        kind: 'sql-query',
        title: '查询总数',
        datasourceId: '',
        outputVariable: 'countResult',
        sql: countSql,
        multipleRows: false,
      },
      {
        id: selectStepId,
        kind: 'sql-query',
        title: '查询列表',
        datasourceId: '',
        outputVariable: 'selectResult',
        sql: selectSql,
        multipleRows: true,
      },
      {
        id: createId('step'),
        kind: 'js-transform',
        title: '组装列表响应',
        outputVariable: 'response',
        role: 'assemble',
        script: `return { list: selectResult, total: countResult?.total ?? 0 }`,
      },
    ],
  }
}

export function buildCreateOperation(
  schemaName: string | null | undefined,
  objectName: string,
  columns: DataSourceSchemaColumn[],
  pkColumns: DataSourceSchemaColumn[],
  dialect: Dialect,
  pathPrefix?: string,
): CrudOperation {
  const tableRef = buildTableRef(schemaName, objectName)
  const basePath = pathPrefix ? `/${pathPrefix}` : ''
  const writableColumns = columns.filter((c) => !c.autoIncrement)
  const colNames = columnList(writableColumns)
  const placeholders = writableColumns.map((c) => `$input.${c.name}`).join(', ')

  const steps: WorkflowStep[] = []

  if (supportsReturning(dialect)) {
    const returning = dialect === 'sqlserver' ? 'OUTPUT INSERTED.*' : 'RETURNING *'
    steps.push({
      id: createId('step'),
      kind: 'sql-query',
      title: '插入并返回',
      datasourceId: '',
      outputVariable: 'insertResult',
      sql: `INSERT INTO ${tableRef} (${colNames}) VALUES (${placeholders}) ${returning}`,
      multipleRows: false,
    })
  } else {
    steps.push({
      id: createId('step'),
      kind: 'sql-query',
      title: '插入记录',
      datasourceId: '',
      outputVariable: 'insertResult',
      sql: `INSERT INTO ${tableRef} (${colNames}) VALUES (${placeholders})`,
      multipleRows: false,
    })

    // MySQL：单自增主键时回查；否则按传入主键查询
    if (pkColumns.length === 1 && pkColumns[0].autoIncrement) {
      steps.push({
        id: createId('step'),
        kind: 'sql-query',
        title: '回查新增记录',
        datasourceId: '',
        outputVariable: 'rowResult',
        sql: `SELECT * FROM ${tableRef} WHERE ${pkColumns[0].name} = LAST_INSERT_ID()`,
        multipleRows: false,
      })
    } else if (pkColumns.length > 0) {
      steps.push({
        id: createId('step'),
        kind: 'sql-query',
        title: '回查新增记录',
        datasourceId: '',
        outputVariable: 'rowResult',
        sql: `SELECT * FROM ${tableRef} WHERE ${pkWhereClause(pkColumns)}`,
        multipleRows: false,
      })
    }
  }

  steps.push({
    id: createId('step'),
    kind: 'js-transform',
    title: '组装创建响应',
    outputVariable: 'response',
    role: 'assemble',
    script: supportsReturning(dialect)
      ? 'return insertResult ?? null'
      : 'return rowResult ?? null',
  })

  return {
    method: 'POST',
    path: `${basePath}/crud/${objectName}`,
    name: `创建 ${objectName}`,
    requestParams: [],
    responseSchema: [],
    steps,
  }
}

export function buildReadOperation(
  schemaName: string | null | undefined,
  objectName: string,
  _columns: DataSourceSchemaColumn[],
  pkColumns: DataSourceSchemaColumn[],
  dialect: Dialect,
  pathPrefix?: string,
): CrudOperation {
  const tableRef = buildTableRef(schemaName, objectName)
  const basePath = pathPrefix ? `/${pathPrefix}` : ''
  const where = pkColumns.length > 0 ? pkWhereClause(pkColumns) : '1=1'

  return {
    method: 'GET',
    path: `${basePath}/crud/${objectName}/detail`,
    name: `${objectName} 详情`,
    requestParams: [],
    responseSchema: [],
    steps: [
      {
        id: createId('step'),
        kind: 'sql-query',
        title: '查询详情',
        datasourceId: '',
        outputVariable: 'rowResult',
        sql: `SELECT * FROM ${tableRef} WHERE ${where}`,
        multipleRows: false,
      },
      {
        id: createId('step'),
        kind: 'js-transform',
        title: '组装详情响应',
        outputVariable: 'response',
        role: 'assemble',
        script: 'return rowResult ?? null',
      },
    ],
  }
}

export function buildUpdateOperation(
  schemaName: string | null | undefined,
  objectName: string,
  columns: DataSourceSchemaColumn[],
  pkColumns: DataSourceSchemaColumn[],
  dialect: Dialect,
  pathPrefix?: string,
): CrudOperation {
  const tableRef = buildTableRef(schemaName, objectName)
  const basePath = pathPrefix ? `/${pathPrefix}` : ''
  const pkNames = new Set(pkColumns.map((c) => c.name))
  const updatableColumns = columns.filter((c) => !pkNames.has(c.name))

  const setClause =
    updatableColumns.length > 0
      ? updatableColumns
          .map((c) => `${quoteIdentifier(c.name)} = $input.${c.name}?`)
          .join(', ')
      : `${quoteIdentifier(columns[0].name)} = $input.${columns[0].name}?`

  const where = pkColumns.length > 0 ? pkWhereClause(pkColumns) : '1=1'

  return {
    method: 'PUT',
    path: `${basePath}/crud/${objectName}`,
    name: `更新 ${objectName}`,
    requestParams: [],
    responseSchema: [],
    steps: [
      {
        id: createId('step'),
        kind: 'sql-query',
        title: '更新记录',
        datasourceId: '',
        outputVariable: 'updateResult',
        sql: `UPDATE ${tableRef} SET ${setClause} WHERE ${where}`,
        multipleRows: false,
      },
      {
        id: createId('step'),
        kind: 'sql-query',
        title: '回查记录',
        datasourceId: '',
        outputVariable: 'rowResult',
        sql: `SELECT * FROM ${tableRef} WHERE ${where}`,
        multipleRows: false,
      },
      {
        id: createId('step'),
        kind: 'js-transform',
        title: '组装更新响应',
        outputVariable: 'response',
        role: 'assemble',
        script: 'return rowResult ?? null',
      },
    ],
  }
}

export function buildDeleteOperation(
  schemaName: string | null | undefined,
  objectName: string,
  _columns: DataSourceSchemaColumn[],
  pkColumns: DataSourceSchemaColumn[],
  dialect: Dialect,
  pathPrefix?: string,
): CrudOperation {
  const tableRef = buildTableRef(schemaName, objectName)
  const basePath = pathPrefix ? `/${pathPrefix}` : ''
  const where = pkColumns.length > 0 ? pkWhereClause(pkColumns) : '1=1'

  if (supportsReturning(dialect)) {
    const returning = dialect === 'sqlserver' ? 'OUTPUT DELETED.*' : 'RETURNING *'
    return {
      method: 'DELETE',
      path: `${basePath}/crud/${objectName}`,
      name: `删除 ${objectName}`,
      requestParams: [],
      responseSchema: [],
      steps: [
        {
          id: createId('step'),
          kind: 'sql-query',
          title: '删除并返回',
          datasourceId: '',
          outputVariable: 'deleteResult',
          sql: `DELETE FROM ${tableRef} ${returning} WHERE ${where}`,
          multipleRows: false,
        },
        {
          id: createId('step'),
          kind: 'js-transform',
          title: '组装删除响应',
          outputVariable: 'response',
          role: 'assemble',
          script: 'return deleteResult ?? null',
        },
      ],
    }
  }

  return {
    method: 'DELETE',
    path: `${basePath}/crud/${objectName}`,
    name: `删除 ${objectName}`,
    requestParams: [],
    responseSchema: [],
    steps: [
      {
        id: createId('step'),
        kind: 'sql-query',
        title: '删除记录',
        datasourceId: '',
        outputVariable: 'deleteResult',
        sql: `DELETE FROM ${tableRef} WHERE ${where}`,
        multipleRows: false,
      },
      {
        id: createId('step'),
        kind: 'js-transform',
        title: '组装删除响应',
        outputVariable: 'response',
        role: 'assemble',
        script: 'return { deleted: true }',
      },
    ],
  }
}
