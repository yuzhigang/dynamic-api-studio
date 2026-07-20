import knex from 'knex'
import { describe, expect, it } from 'vitest'

import { generateMigrationSql } from '@/server/domains/db-migration/migration-sql-generator'
import type { ProjectDbSchema } from '@/shared/contracts/project-db-schema.contract'
import type { DataSourceSchemaTable } from '@/shared/contracts/data-source.contract'

describe('generateMigrationSql', () => {
  const knexInstance = knex({ client: 'pg' })

  const desiredTable = (override?: Partial<ProjectDbSchema>): ProjectDbSchema => ({
    id: 'ds_test',
    projectId: 'p1',
    objectType: 'table',
    objectName: 'orders',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    columns: [
      {
        name: 'id',
        dataType: 'integer',
        nullable: false,
        isPrimaryKey: true,
        autoIncrement: true,
      },
      { name: 'order_no', dataType: 'varchar', length: 64, nullable: false, isPrimaryKey: false },
      { name: 'amount', dataType: 'numeric', precision: 12, scale: 2, nullable: true, isPrimaryKey: false },
    ],
    indexes: [{ name: 'idx_order_no', columns: ['order_no'], unique: true, primary: false }],
    ...override,
  })

  it('generates CREATE TABLE when actual table is missing', () => {
    const { sql, warnings } = generateMigrationSql({
      desired: [desiredTable()],
      actual: [],
      dialect: 'postgresql',
      knex: knexInstance,
    })

    expect(sql).toContain('create table "orders"')
    expect(sql).toContain('"order_no" varchar(64) not null')
    expect(sql).toContain('"amount" decimal(12, 2)')
    expect(sql).toContain('primary key')
    expect(sql).toContain('idx_order_no')
    expect(sql).toContain('unique ("order_no")')
    expect(warnings).toHaveLength(0)
  })

  it('generates ALTER TABLE when column differs', () => {
    const actual: DataSourceSchemaTable[] = [
      {
        name: 'orders',
        columns: [
          { name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true },
          { name: 'order_no', dataType: 'varchar', length: 64, nullable: false, isPrimaryKey: false },
        ],
      },
    ]

    const { sql } = generateMigrationSql({
      desired: [desiredTable()],
      actual,
      dialect: 'postgresql',
      knex: knexInstance,
    })

    expect(sql).toContain('alter table "orders"')
    expect(sql).toContain('"amount" decimal(12, 2)')
  })

  it('drops columns that are no longer desired', () => {
    const actual: DataSourceSchemaTable[] = [
      {
        name: 'orders',
        columns: [
          { name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true },
          { name: 'order_no', dataType: 'varchar', length: 64, nullable: false, isPrimaryKey: false },
          { name: 'legacy', dataType: 'text', nullable: true, isPrimaryKey: false },
        ],
      },
    ]

    const { sql } = generateMigrationSql({
      desired: [desiredTable()],
      actual,
      dialect: 'postgresql',
      knex: knexInstance,
    })

    expect(sql).toContain('drop column "legacy"')
  })

  it('creates and drops indexes', () => {
    const actual: DataSourceSchemaTable[] = [
      {
        name: 'orders',
        columns: [
          { name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true },
          { name: 'order_no', dataType: 'varchar', length: 64, nullable: false, isPrimaryKey: false },
          { name: 'amount', dataType: 'numeric', precision: 12, scale: 2, nullable: true, isPrimaryKey: false },
        ],
        indexes: [{ name: 'idx_legacy', columns: ['order_no'], unique: false, primary: false }],
      },
    ]

    const { sql } = generateMigrationSql({
      desired: [desiredTable()],
      actual,
      dialect: 'postgresql',
      knex: knexInstance,
    })

    expect(sql).toContain('drop index "idx_legacy"')
    expect(sql).toContain('idx_order_no')
    expect(sql).toContain('unique ("order_no")')
  })

  it('warns about extra actual tables', () => {
    const actual: DataSourceSchemaTable[] = [
      {
        name: 'legacy_table',
        columns: [{ name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true }],
      },
    ]

    const { sql, warnings } = generateMigrationSql({
      desired: [desiredTable()],
      actual,
      dialect: 'postgresql',
      knex: knexInstance,
    })

    expect(sql).toContain('create table "orders"')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('legacy_table')
  })

  it('ignores views when generating migration', () => {
    const { sql } = generateMigrationSql({
      desired: [desiredTable({ objectType: 'view' })],
      actual: [],
      dialect: 'postgresql',
      knex: knexInstance,
    })

    expect(sql).toBe('')
  })
})
