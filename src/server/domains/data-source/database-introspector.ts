import type { Knex } from 'knex'
import SchemaInspector from 'knex-schema-inspector'
import type { Column as InspectorColumn } from 'knex-schema-inspector/dist/types/column'
import type { ForeignKey as InspectorForeignKey } from 'knex-schema-inspector/dist/types/foreign-key'
import type { Table as InspectorTable } from 'knex-schema-inspector/dist/types/table'

import type {
  DataSource,
  DataSourceSchema,
  DataSourceSchemaColumn,
  DataSourceSchemaForeignKey,
  DataSourceSchemaTable,
} from '@/shared/contracts/data-source.contract'

/**
 * 把 knex-schema-inspector 的 tableInfo/columnInfo/foreignKeys 结果映射成 DataSourceSchema（纯函数，便于单测）。
 *
 * 列含主键、类型、长度/精度/标度、可空、默认值、自增、注释、序号；外键按 (table, constraint) 分组（兼容复合外键）。
 * 索引本轮不取（knex-schema-inspector 无 indexes() 方法）。
 */
export function mapInspectorSchema(
  datasourceId: string,
  tables: InspectorTable[],
  columns: InspectorColumn[],
  fks: InspectorForeignKey[],
): DataSourceSchema {
  const columnsByTable = new Map<string, DataSourceSchemaColumn[]>()
  for (const c of columns) {
    const key = `${c.schema ?? ''}|${c.table}`
    const arr = columnsByTable.get(key) ?? []
    arr.push({
      name: c.name,
      dataType: c.data_type,
      length: c.max_length,
      precision: c.numeric_precision,
      scale: c.numeric_scale,
      nullable: c.is_nullable,
      isPrimaryKey: c.is_primary_key,
      defaultValue: c.default_value,
      autoIncrement: c.has_auto_increment,
      comment: c.comment ?? undefined,
      ordinalPosition: arr.length + 1,
    })
    columnsByTable.set(key, arr)
  }

  // 外键按 (table, constraint_name) 分组，合并 columns/refColumns（兼容复合外键）。
  const fkGroupMap = new Map<
    string,
    {
      table: string
      name: string
      columns: string[]
      refSchema: string | null
      refTable: string
      refColumns: string[]
      onDelete: string | null
      onUpdate: string | null
    }
  >()
  for (const fk of fks) {
    const gkey = `${fk.table}|${fk.constraint_name ?? ''}`
    const g =
      fkGroupMap.get(gkey) ?? {
        table: fk.table,
        name: fk.constraint_name ?? `${fk.table}_${fk.column}_fk`,
        columns: [],
        refSchema: fk.foreign_key_schema ?? null,
        refTable: fk.foreign_key_table,
        refColumns: [],
        onDelete: fk.on_delete,
        onUpdate: fk.on_update,
      }
    g.columns.push(fk.column)
    g.refColumns.push(fk.foreign_key_column)
    fkGroupMap.set(gkey, g)
  }

  const fksByTable = new Map<string, DataSourceSchemaForeignKey[]>()
  for (const g of fkGroupMap.values()) {
    const list = fksByTable.get(g.table) ?? []
    list.push({
      name: g.name,
      columns: g.columns,
      refSchema: g.refSchema,
      refTable: g.refTable,
      refColumns: g.refColumns,
      onDelete: g.onDelete,
      onUpdate: g.onUpdate,
    })
    fksByTable.set(g.table, list)
  }

  const tablesOut: DataSourceSchemaTable[] = tables.map((t) => {
    const key = `${t.schema ?? ''}|${t.name}`
    return {
      name: t.name,
      schemaName: t.schema,
      comment: t.comment ?? undefined,
      columns: columnsByTable.get(key) ?? [],
      foreignKeys: fksByTable.get(t.name) ?? [],
    }
  })

  return { datasourceId, tables: tablesOut }
}

/**
 * 数据库 schema 探测器：经 Knex 连业务库，用 `knex-schema-inspector`（Knex 官方插件）跨方言探测。
 *
 * 支持 postgresql / mysql / sqlserver(→mssql) / oracle(→oracledb) / sqlite / cockroachdb（由插件处理方言差异）。
 * tdengine 插件不支持，抛「暂不支持」。索引本轮不取（插件无 indexes()）。
 */
export class DatabaseIntrospector {
  async introspect(
    knex: Knex,
    dialect: DataSource['dialect'],
    datasourceId: string,
  ): Promise<DataSourceSchema> {
    if (dialect === 'tdengine') {
      throw new Error('暂不支持 tdengine 的 schema 探测（knex-schema-inspector 不支持该方言）')
    }
    const inspector = SchemaInspector(knex)
    const [tables, columns, fks] = await Promise.all([
      inspector.tableInfo(),
      inspector.columnInfo(),
      inspector.foreignKeys(),
    ])
    return mapInspectorSchema(datasourceId, tables, columns, fks)
  }
}