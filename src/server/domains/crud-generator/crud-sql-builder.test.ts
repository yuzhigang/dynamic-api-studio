import { describe, expect, it } from 'vitest'

import {
  buildCreateOperation,
  buildDeleteOperation,
  buildListOperation,
  buildReadOperation,
  buildUpdateOperation,
} from '@/server/domains/crud-generator/crud-sql-builder'
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

const columns = [
  col({ name: 'id', dataType: 'int', nullable: false, isPrimaryKey: true, autoIncrement: true }),
  col({ name: 'name', dataType: 'varchar', nullable: false }),
  col({ name: 'age', dataType: 'int', nullable: true }),
]

const pkColumns = [columns[0]]

describe('buildListOperation', () => {
  it('generates count and select SQL with filters for postgresql', () => {
    const op = buildListOperation(null, 'users', columns, pkColumns, 'postgresql')

    expect(op.method).toBe('GET')
    expect(op.path).toBe('/crud/users/list')
    const steps = op.steps.filter((s) => s.kind === 'sql-query')
    expect(steps).toHaveLength(2)
    expect(steps[0].sql).toContain('SELECT COUNT(*) AS total FROM users WHERE 1=1')
    expect(steps[0].sql).toContain('name = $input.name?')
    expect(steps[1].sql).toContain('SELECT * FROM users WHERE 1=1')
    expect(steps[1].sql).toContain('LIMIT $input.pageSize OFFSET')
  })

  it('uses OFFSET/FETCH for sqlserver', () => {
    const op = buildListOperation(null, 'users', columns, pkColumns, 'sqlserver')
    const selectStep = op.steps.find((s) => s.kind === 'sql-query' && s.title === '查询列表')
    expect(selectStep?.sql).toContain('OFFSET ($input.pageNo - 1) * $input.pageSize ROWS FETCH NEXT')
  })
})

describe('buildCreateOperation', () => {
  it('uses RETURNING for postgresql', () => {
    const op = buildCreateOperation(null, 'users', columns, pkColumns, 'postgresql')

    expect(op.method).toBe('POST')
    const step = op.steps.find((s) => s.kind === 'sql-query')
    expect(step?.sql).toContain('INSERT INTO users (name, age) VALUES ($input.name, $input.age)')
    expect(step?.sql).toContain('RETURNING *')
  })

  it('uses OUTPUT INSERTED for sqlserver', () => {
    const op = buildCreateOperation(null, 'users', columns, pkColumns, 'sqlserver')
    const step = op.steps.find((s) => s.kind === 'sql-query')
    expect(step?.sql).toContain('OUTPUT INSERTED.*')
  })

  it('falls back to insert + select for mysql', () => {
    const op = buildCreateOperation(null, 'users', columns, pkColumns, 'mysql')
    const steps = op.steps.filter((s) => s.kind === 'sql-query')
    expect(steps).toHaveLength(2)
    expect(steps[1].sql).toContain('LAST_INSERT_ID()')
  })

  it('excludes auto-increment columns from insert columns', () => {
    const op = buildCreateOperation(null, 'users', columns, pkColumns, 'postgresql')
    const step = op.steps.find((s) => s.kind === 'sql-query')
    expect(step?.sql).not.toContain('id')
  })
})

describe('buildReadOperation', () => {
  it('generates select by primary key', () => {
    const op = buildReadOperation(null, 'users', columns, pkColumns, 'postgresql')

    expect(op.method).toBe('GET')
    expect(op.path).toBe('/crud/users/detail')
    const step = op.steps.find((s) => s.kind === 'sql-query')
    expect(step?.sql).toBe('SELECT * FROM users WHERE id = $input.id')
  })
})

describe('buildUpdateOperation', () => {
  it('generates update with optional set clauses and pk where', () => {
    const op = buildUpdateOperation(null, 'users', columns, pkColumns, 'postgresql')

    expect(op.method).toBe('PUT')
    const steps = op.steps.filter((s) => s.kind === 'sql-query')
    expect(steps[0].sql).toContain('UPDATE users SET')
    expect(steps[0].sql).toContain('name = $input.name?')
    expect(steps[0].sql).toContain('WHERE id = $input.id')
    expect(steps[1].sql).toContain('SELECT * FROM users WHERE id = $input.id')
  })
})

describe('buildDeleteOperation', () => {
  it('uses RETURNING for postgresql', () => {
    const op = buildDeleteOperation(null, 'users', columns, pkColumns, 'postgresql')

    expect(op.method).toBe('DELETE')
    const step = op.steps.find((s) => s.kind === 'sql-query')
    expect(step?.sql).toContain('DELETE FROM users')
    expect(step?.sql).toContain('RETURNING *')
  })

  it('uses simple delete for mysql', () => {
    const op = buildDeleteOperation(null, 'users', columns, pkColumns, 'mysql')
    const step = op.steps.find((s) => s.kind === 'sql-query')
    expect(step?.sql).toBe('DELETE FROM users WHERE id = $input.id')
  })
})
