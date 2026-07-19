import { describe, expect, it } from 'vitest'

import {
  buildEntityJsonSchema,
  buildEntityResponseSchemaFields,
  buildListResponseSchemaFields,
  buildRequestParamsFromColumns,
  mapSqlTypeToJsonSchema,
} from '@/server/domains/crud-generator/crud-schema-builder'
import type { DataSourceSchemaColumn } from '@/shared/schemas/data-source.schema'

function col(partial: Partial<DataSourceSchemaColumn> & { name: string }): DataSourceSchemaColumn {
  return {
    name: partial.name,
    dataType: partial.dataType ?? 'varchar',
    length: partial.length ?? null,
    precision: partial.precision ?? null,
    scale: partial.scale ?? null,
    nullable: partial.nullable ?? true,
    isPrimaryKey: partial.isPrimaryKey ?? false,
    defaultValue: partial.defaultValue ?? null,
    autoIncrement: partial.autoIncrement ?? false,
    ordinalPosition: partial.ordinalPosition ?? 1,
    comment: partial.comment,
  }
}

describe('mapSqlTypeToJsonSchema', () => {
  it('maps varchar to string', () => {
    expect(mapSqlTypeToJsonSchema(col({ name: 'c', dataType: 'varchar' }))).toEqual({
      jsonSchemaType: 'string',
      scalarType: 'string',
    })
  })

  it('maps int to integer', () => {
    expect(mapSqlTypeToJsonSchema(col({ name: 'c', dataType: 'int' }))).toEqual({
      jsonSchemaType: 'integer',
      scalarType: 'integer',
    })
  })

  it('maps numeric to decimal', () => {
    expect(mapSqlTypeToJsonSchema(col({ name: 'c', dataType: 'numeric' }))).toEqual({
      jsonSchemaType: 'number',
      scalarType: 'decimal',
    })
  })

  it('maps boolean to boolean', () => {
    expect(mapSqlTypeToJsonSchema(col({ name: 'c', dataType: 'bool' }))).toEqual({
      jsonSchemaType: 'boolean',
      scalarType: 'boolean',
    })
  })

  it('maps json to object', () => {
    expect(mapSqlTypeToJsonSchema(col({ name: 'c', dataType: 'jsonb' }))).toEqual({
      jsonSchemaType: 'object',
      scalarType: 'object',
    })
  })

  it('maps array-like type to array', () => {
    expect(mapSqlTypeToJsonSchema(col({ name: 'c', dataType: '_int' }))).toEqual({
      jsonSchemaType: 'array',
      scalarType: 'array',
    })
  })
})

describe('buildEntityJsonSchema', () => {
  it('builds an object schema with properties and required', () => {
    const schema = buildEntityJsonSchema('users', [
      col({ name: 'id', dataType: 'int', nullable: false, isPrimaryKey: true }),
      col({ name: 'name', dataType: 'varchar', nullable: false }),
      col({ name: 'age', dataType: 'int', nullable: true }),
    ])

    expect(schema.type).toBe('object')
    expect(schema.title).toBe('users')
    expect(Object.keys(schema.properties as Record<string, unknown>)).toEqual(['id', 'name', 'age'])
    expect(schema.required).toEqual(['id', 'name'])
  })

  it('marks nullable columns without default as not required', () => {
    const schema = buildEntityJsonSchema('users', [
      col({ name: 'id', dataType: 'int', nullable: false }),
      col({ name: 'nickname', dataType: 'varchar', nullable: true }),
    ])

    expect(schema.required).toEqual(['id'])
  })

  it('embeds x-sql mapping and comment', () => {
    const schema = buildEntityJsonSchema('users', [
      col({ name: 'id', dataType: 'int', nullable: false, comment: '主键' }),
    ])

    const properties = schema.properties as Record<string, Record<string, unknown>>
    expect(properties.id['x-sql']).toEqual({ kind: 'field', map: 'id' })
    expect(properties.id.description).toBe('主键')
  })
})

describe('buildEntityResponseSchemaFields', () => {
  it('produces SchemaField array from columns', () => {
    const fields = buildEntityResponseSchemaFields([
      col({ name: 'id', dataType: 'int', nullable: false }),
      col({ name: 'price', dataType: 'numeric', nullable: true }),
    ])

    expect(fields).toHaveLength(2)
    expect(fields[0]).toMatchObject({ name: 'id', type: 'integer', required: true })
    expect(fields[1]).toMatchObject({ name: 'price', type: 'decimal', required: false })
  })
})

describe('buildListResponseSchemaFields', () => {
  it('wraps row fields in list + total', () => {
    const rowFields = buildEntityResponseSchemaFields([col({ name: 'id', dataType: 'int', nullable: false })])
    const fields = buildListResponseSchemaFields(rowFields)

    expect(fields).toHaveLength(2)
    expect(fields[0]).toMatchObject({ name: 'list', type: 'array', required: true })
    expect(fields[1]).toMatchObject({ name: 'total', type: 'integer', required: true })
    expect(fields[0].children).toEqual(rowFields)
  })
})

describe('buildRequestParamsFromColumns', () => {
  it('creates query params with optional by default', () => {
    const params = buildRequestParamsFromColumns(
      [col({ name: 'id', dataType: 'int', nullable: false })],
      'query',
      () => true,
    )

    expect(params[0]).toMatchObject({ name: 'id', location: 'query', type: 'integer', required: false })
  })

  it('marks required according to predicate', () => {
    const params = buildRequestParamsFromColumns(
      [col({ name: 'id', dataType: 'int', nullable: false })],
      'query',
      () => true,
      () => true,
    )

    expect(params[0].required).toBe(true)
  })
})
