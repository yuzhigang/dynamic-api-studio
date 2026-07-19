import { scalarTypeSchema, type SchemaField, type RequestParam } from '@/shared/schemas/api-definition.schema'
import type { DataSourceSchemaColumn } from '@/shared/schemas/data-source.schema'
import type { z } from 'zod'

export type JsonSchemaProperty = {
  type: string
  description?: string
  default?: unknown
  nullable?: boolean
  format?: string
  'x-sql'?: { kind: 'field'; map: string }
}

export type SqlTypeMapping = {
  jsonSchemaType: string
  scalarType: z.infer<typeof scalarTypeSchema>
  format?: string
}

export function mapSqlTypeToJsonSchema(column: DataSourceSchemaColumn): SqlTypeMapping {
  const dataType = (column.dataType ?? '').toLowerCase()

  if (
    dataType.includes('varchar') ||
    dataType.includes('char') ||
    dataType.includes('text') ||
    dataType.includes('nvarchar') ||
    dataType.includes('clob') ||
    dataType.includes('uuid') ||
    dataType.includes('date') ||
    dataType.includes('time') ||
    dataType.includes('datetime') ||
    dataType.includes('timestamp') ||
    dataType.includes('enum') ||
    dataType.includes('set') ||
    dataType.includes('binary') ||
    dataType.includes('blob') ||
    dataType.includes('bytea')
  ) {
    const format = dataType.includes('date')
      ? 'date'
      : dataType.includes('time')
        ? 'date-time'
        : dataType.includes('uuid')
          ? 'uuid'
          : undefined
    return { jsonSchemaType: 'string', scalarType: 'string', format }
  }

  if (
    dataType.includes('numeric') ||
    dataType.includes('decimal') ||
    dataType.includes('float') ||
    dataType.includes('double') ||
    dataType.includes('real') ||
    dataType.includes('money') ||
    dataType.includes('number')
  ) {
    return { jsonSchemaType: 'number', scalarType: 'decimal' }
  }

  if (dataType.startsWith('_') || dataType.includes('[]')) {
    return { jsonSchemaType: 'array', scalarType: 'array' }
  }

  if (
    dataType.includes('int') ||
    dataType.includes('serial') ||
    dataType.includes('identity') ||
    /^int\d*$/.test(dataType) ||
    dataType.includes('smallint') ||
    dataType.includes('tinyint') ||
    dataType.includes('bigint')
  ) {
    return { jsonSchemaType: 'integer', scalarType: 'integer' }
  }

  if (dataType.includes('bool') || dataType === 'bit') {
    return { jsonSchemaType: 'boolean', scalarType: 'boolean' }
  }

  if (dataType.includes('json')) {
    return { jsonSchemaType: 'object', scalarType: 'object' }
  }

  return { jsonSchemaType: 'string', scalarType: 'string' }
}

export function buildColumnJsonSchemaProperty(column: DataSourceSchemaColumn): JsonSchemaProperty {
  const mapping = mapSqlTypeToJsonSchema(column)
  const property: JsonSchemaProperty = {
    type: mapping.jsonSchemaType,
    'x-sql': { kind: 'field', map: column.name },
  }

  if (mapping.format) {
    property.format = mapping.format
  }

  if (column.nullable) {
    property.nullable = true
  }

  if (column.comment) {
    property.description = column.comment
  }

  if (column.defaultValue !== undefined && column.defaultValue !== null) {
    property.default = column.defaultValue
  }

  return property
}

export function buildEntityJsonSchema(
  objectName: string,
  columns: DataSourceSchemaColumn[],
  comment?: string,
): Record<string, unknown> {
  const properties: Record<string, JsonSchemaProperty> = {}
  const required: string[] = []

  for (const column of columns) {
    properties[column.name] = buildColumnJsonSchemaProperty(column)
    if (!column.nullable && column.defaultValue === null && !column.autoIncrement) {
      required.push(column.name)
    }
  }

  const schema: Record<string, unknown> = {
    type: 'object',
    title: objectName,
    properties,
  }

  if (required.length > 0) {
    schema.required = required
  }

  if (comment) {
    schema.description = comment
  }

  return schema
}

export function buildEntityResponseSchemaFields(columns: DataSourceSchemaColumn[]): SchemaField[] {
  return columns.map((column) => {
    const mapping = mapSqlTypeToJsonSchema(column)
    return {
      id: `schema_${column.name}`,
      name: column.name,
      type: mapping.scalarType,
      required: !column.nullable,
      description: column.comment,
    }
  })
}

export function buildListResponseSchemaFields(rowFields: SchemaField[]): SchemaField[] {
  return [
    {
      id: 'schema_list',
      name: 'list',
      type: 'array',
      required: true,
      children: rowFields,
    },
    {
      id: 'schema_total',
      name: 'total',
      type: 'integer',
      required: true,
    },
  ]
}

export function buildRequestParamsFromColumns(
  columns: DataSourceSchemaColumn[],
  location: RequestParam['location'],
  predicate: (column: DataSourceSchemaColumn) => boolean,
  requiredPredicate: (column: DataSourceSchemaColumn) => boolean = () => false,
): RequestParam[] {
  return columns.filter(predicate).map((column) => {
    const mapping = mapSqlTypeToJsonSchema(column)
    return {
      id: `param_${column.name}`,
      name: column.name,
      location,
      type: mapping.scalarType,
      required: requiredPredicate(column),
      example: '',
      description: column.comment,
    }
  })
}
