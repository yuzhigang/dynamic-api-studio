import type { Knex } from 'knex'

import type { ProjectDbSchema } from '@/shared/contracts/project-db-schema.contract'
import type { DataSourceSchemaColumn, DataSourceSchemaTable } from '@/shared/contracts/data-source.contract'
import type { Dialect } from '@/shared/schemas/data-source.schema'

export type MigrationSqlResult = {
  sql: string
  warnings: string[]
}

export function generateMigrationSql({
  desired,
  actual,
  dialect,
  knex,
}: {
  desired: ProjectDbSchema[]
  actual: DataSourceSchemaTable[]
  dialect: Dialect
  knex: Knex
}): MigrationSqlResult {
  const warnings: string[] = []
  const statements: string[] = []

  for (const desiredTable of desired.filter((t) => t.objectType === 'table')) {
    const actualTable = findActualTable(actual, desiredTable.schemaName, desiredTable.objectName)

    if (!actualTable) {
      const sql = buildCreateTable(knex, desiredTable, dialect)
      statements.push(...sql)
      for (const index of desiredTable.indexes ?? []) {
        statements.push(...buildCreateIndex(knex, desiredTable, index))
      }
      continue
    }

    const columnChanges = diffColumns(desiredTable.columns, actualTable.columns)
    const indexChanges = diffIndexes(desiredTable.indexes ?? [], actualTable.indexes ?? [])

    if (columnChanges.length > 0) {
      const sql = buildAlterTable(knex, desiredTable, columnChanges, dialect)
      statements.push(...sql)
    }

    for (const index of indexChanges.add) {
      statements.push(...buildCreateIndex(knex, desiredTable, index))
    }
    for (const index of indexChanges.drop) {
      statements.push(...buildDropIndex(knex, desiredTable, index))
    }
  }

  const extraTables = actual.filter(
    (actualTable) =>
      !desired.some(
        (d) =>
          d.objectType === 'table' &&
          d.schemaName === actualTable.schemaName &&
          d.objectName === actualTable.name,
      ),
  )
  if (extraTables.length > 0) {
    warnings.push(
      `以下实际表未在模型中定义，未生成删除 SQL：${extraTables.map((t) => t.name).join(', ')}`,
    )
  }

  return { sql: statements.join(';\n'), warnings }
}

function findActualTable(
  actual: DataSourceSchemaTable[],
  schemaName: string | undefined,
  objectName: string,
): DataSourceSchemaTable | undefined {
  return actual.find((t) => t.schemaName === schemaName && t.name === objectName)
}

function tableIdentifier(schemaName: string | undefined, objectName: string): string {
  return schemaName ? `${schemaName}.${objectName}` : objectName
}

type ColumnChange =
  | { kind: 'add'; column: DataSourceSchemaColumn }
  | { kind: 'drop'; column: DataSourceSchemaColumn }
  | { kind: 'alter'; desired: DataSourceSchemaColumn; actual: DataSourceSchemaColumn }

function diffColumns(
  desired: DataSourceSchemaColumn[],
  actual: DataSourceSchemaColumn[],
): ColumnChange[] {
  const changes: ColumnChange[] = []
  const actualByName = new Map(actual.map((c) => [c.name, c]))

  for (const col of desired) {
    const existing = actualByName.get(col.name)
    if (!existing) {
      changes.push({ kind: 'add', column: col })
    } else if (!columnEquals(col, existing)) {
      changes.push({ kind: 'alter', desired: col, actual: existing })
    }
  }

  for (const col of actual) {
    if (!desired.some((c) => c.name === col.name)) {
      changes.push({ kind: 'drop', column: col })
    }
  }

  return changes
}

function columnEquals(a: DataSourceSchemaColumn, b: DataSourceSchemaColumn): boolean {
  return (
    a.dataType === b.dataType &&
    a.length === b.length &&
    a.precision === b.precision &&
    a.scale === b.scale &&
    a.nullable === b.nullable &&
    a.isPrimaryKey === b.isPrimaryKey &&
    a.defaultValue === b.defaultValue &&
    a.autoIncrement === b.autoIncrement
  )
}

type IndexChange = {
  add: Array<NonNullable<ProjectDbSchema['indexes']>[number]>
  drop: Array<NonNullable<ProjectDbSchema['indexes']>[number]>
}

function diffIndexes(
  desired: NonNullable<ProjectDbSchema['indexes']>,
  actual: NonNullable<DataSourceSchemaTable['indexes']>,
): IndexChange {
  const add: IndexChange['add'] = []
  const drop: IndexChange['drop'] = []

  for (const idx of desired) {
    if (!actual.some((a) => a.name === idx.name)) {
      add.push(idx)
    }
  }

  for (const idx of actual) {
    if (!desired.some((d) => d.name === idx.name)) {
      drop.push(idx)
    }
  }

  return { add, drop }
}

function buildCreateTable(knex: Knex, table: ProjectDbSchema, dialect: Dialect): string[] {
  const builder = table.schemaName
    ? knex.schema.withSchema(table.schemaName).createTable(table.objectName, (t) => {
        for (const column of table.columns) {
          buildColumn(t, column, dialect, knex)
        }
        const pkColumns = table.columns.filter((c) => c.isPrimaryKey).map((c) => c.name)
        if (pkColumns.length > 0) {
          t.primary(pkColumns)
        }
      })
    : knex.schema.createTable(table.objectName, (t) => {
        for (const column of table.columns) {
          buildColumn(t, column, dialect, knex)
        }
        const pkColumns = table.columns.filter((c) => c.isPrimaryKey).map((c) => c.name)
        if (pkColumns.length > 0) {
          t.primary(pkColumns)
        }
      })
  return builder.toSQL().map((s) => s.sql)
}

function buildAlterTable(
  knex: Knex,
  table: ProjectDbSchema,
  changes: ColumnChange[],
  dialect: Dialect,
): string[] {
  const builder = table.schemaName
    ? knex.schema.withSchema(table.schemaName).alterTable(table.objectName, (t) => {
        for (const change of changes) {
          if (change.kind === 'add') {
            buildColumn(t, change.column, dialect, knex)
          } else if (change.kind === 'drop') {
            t.dropColumn(change.column.name)
          } else if (change.kind === 'alter') {
            const col = buildColumnBuilder(t, change.desired, dialect)
            col.alter()
          }
        }
      })
    : knex.schema.alterTable(table.objectName, (t) => {
        for (const change of changes) {
          if (change.kind === 'add') {
            buildColumn(t, change.column, dialect, knex)
          } else if (change.kind === 'drop') {
            t.dropColumn(change.column.name)
          } else if (change.kind === 'alter') {
            const col = buildColumnBuilder(t, change.desired, dialect)
            col.alter()
          }
        }
      })
  return builder.toSQL().map((s) => s.sql)
}

function buildCreateIndex(
  knex: Knex,
  table: ProjectDbSchema,
  index: NonNullable<ProjectDbSchema['indexes']>[number],
): string[] {
  const builder = table.schemaName
    ? knex.schema.withSchema(table.schemaName).table(table.objectName, (t) => {
        if (index.unique) {
          t.unique(index.columns, index.name)
        } else {
          t.index(index.columns, index.name)
        }
      })
    : knex.schema.table(table.objectName, (t) => {
        if (index.unique) {
          t.unique(index.columns, index.name)
        } else {
          t.index(index.columns, index.name)
        }
      })
  return builder.toSQL().map((s) => s.sql)
}

function buildDropIndex(
  knex: Knex,
  table: ProjectDbSchema,
  index: NonNullable<ProjectDbSchema['indexes']>[number],
): string[] {
  const tableName = tableIdentifier(table.schemaName, table.objectName)
  const builder = knex.schema.table(tableName, (t) => {
    t.dropIndex(index.columns, index.name)
  })
  return builder.toSQL().map((s) => s.sql)
}

function buildColumn(
  t: Knex.CreateTableBuilder | Knex.AlterTableBuilder,
  column: DataSourceSchemaColumn,
  dialect: Dialect,
  knex: Knex,
): Knex.ColumnBuilder {
  const col = buildColumnBuilder(t, column, dialect)
  if (column.nullable) {
    col.nullable()
  } else {
    col.notNullable()
  }
  if (column.defaultValue !== null && column.defaultValue !== undefined) {
    col.defaultTo(knex.raw(column.defaultValue))
  }
  return col
}

function buildColumnBuilder(
  t: Knex.CreateTableBuilder | Knex.AlterTableBuilder,
  column: DataSourceSchemaColumn,
  dialect: Dialect,
): Knex.ColumnBuilder {
  const dataType = (column.dataType ?? '').toLowerCase()
  const name = column.name

  if (column.autoIncrement && column.isPrimaryKey) {
    if (dataType.includes('bigint')) return t.bigIncrements(name)
    return t.increments(name)
  }

  if (dataType.includes('int') || dataType.includes('serial') || /^int\d*$/.test(dataType)) {
    if (dataType.includes('bigint')) return t.bigint(name)
    return t.integer(name)
  }

  if (dataType.includes('numeric') || dataType.includes('decimal')) {
    return t.decimal(name, column.precision ?? undefined, column.scale ?? undefined)
  }

  if (dataType.includes('float') || dataType.includes('double') || dataType.includes('real')) {
    return t.float(name, column.precision ?? undefined, column.scale ?? undefined)
  }

  if (dataType.includes('boolean') || dataType === 'bit' || dataType.includes('bool')) {
    return t.boolean(name)
  }

  if (dataType.includes('text') || dataType.includes('clob')) {
    return t.text(name)
  }

  if (dataType.includes('varchar') || dataType.includes('char') || dataType.includes('nvarchar')) {
    return t.string(name, column.length ?? undefined)
  }

  if (dataType.includes('datetime') || dataType.includes('timestamp')) {
    return dialect === 'mysql' || dialect === 'sqlserver' ? t.dateTime(name) : t.timestamp(name)
  }

  if (dataType.includes('date')) {
    return t.date(name)
  }

  if (dataType.includes('jsonb')) {
    return t.jsonb(name)
  }

  if (dataType.includes('json')) {
    return t.json(name)
  }

  if (dataType.includes('uuid')) {
    return t.uuid(name)
  }

  if (dataType.includes('binary') || dataType.includes('blob') || dataType.includes('bytea')) {
    return t.binary(name)
  }

  return t.specificType(name, column.dataType)
}
