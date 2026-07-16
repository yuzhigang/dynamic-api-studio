import type { Knex } from 'knex'
import { describe, expect, it } from 'vitest'

import { DatabaseIntrospector, mapInspectorSchema } from '@/server/domains/data-source/database-introspector'

describe('mapInspectorSchema', () => {
  it('maps inspector output to DataSourceSchema with columns, PK, FK, comments', () => {
    const tables = [
      { name: 'orders', schema: 'public', comment: '订单表' },
      { name: 'order_items', schema: 'public', comment: null },
    ]
    const columns = [
      { name: 'id', table: 'orders', schema: 'public', data_type: 'integer', default_value: null, max_length: null, numeric_precision: 32, numeric_scale: 0, is_nullable: false, is_unique: false, is_primary_key: true, is_generated: false, has_auto_increment: true, foreign_key_table: null, foreign_key_column: null, comment: '主键' },
      { name: 'order_no', table: 'orders', schema: 'public', data_type: 'character varying', default_value: null, max_length: 64, numeric_precision: null, numeric_scale: null, is_nullable: false, is_unique: true, is_primary_key: false, is_generated: false, has_auto_increment: false, foreign_key_table: null, foreign_key_column: null, comment: null },
      { name: 'amount', table: 'orders', schema: 'public', data_type: 'numeric', default_value: '0', max_length: null, numeric_precision: 12, numeric_scale: 2, is_nullable: true, is_unique: false, is_primary_key: false, is_generated: false, has_auto_increment: false, foreign_key_table: null, foreign_key_column: null, comment: null },
      { name: 'order_id', table: 'order_items', schema: 'public', data_type: 'integer', default_value: null, max_length: null, numeric_precision: 32, numeric_scale: 0, is_nullable: false, is_unique: false, is_primary_key: true, is_generated: false, has_auto_increment: false, foreign_key_table: 'orders', foreign_key_column: 'id', comment: null },
      { name: 'product_id', table: 'order_items', schema: 'public', data_type: 'integer', default_value: null, max_length: null, numeric_precision: 32, numeric_scale: 0, is_nullable: false, is_unique: false, is_primary_key: true, is_generated: false, has_auto_increment: false, foreign_key_table: null, foreign_key_column: null, comment: null },
    ]
    const fks = [
      { table: 'order_items', column: 'order_id', foreign_key_table: 'orders', foreign_key_column: 'id', foreign_key_schema: 'public', constraint_name: 'fk_items_order', on_update: 'NO ACTION' as const, on_delete: 'CASCADE' as const },
    ]

    const schema = mapInspectorSchema('ds_test', tables, columns, fks)

    expect(schema.datasourceId).toBe('ds_test')
    expect(schema.tables).toHaveLength(2)

    const orders = schema.tables.find((t) => t.name === 'orders')!
    expect(orders.schemaName).toBe('public')
    expect(orders.comment).toBe('订单表')
    expect(orders.columns).toHaveLength(3)
    expect(orders.columns[0]).toMatchObject({ name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true, autoIncrement: true, comment: '主键', ordinalPosition: 1 })
    expect(orders.columns[1]).toMatchObject({ name: 'order_no', dataType: 'character varying', length: 64, isPrimaryKey: false })
    expect(orders.columns[2]).toMatchObject({ name: 'amount', dataType: 'numeric', precision: 12, scale: 2, nullable: true, defaultValue: '0' })
    expect(orders.foreignKeys).toEqual([])

    const items = schema.tables.find((t) => t.name === 'order_items')!
    expect(items.comment).toBeUndefined()
    expect(items.columns).toHaveLength(2)
    expect(items.foreignKeys).toHaveLength(1)
    expect(items.foreignKeys![0]).toMatchObject({
      name: 'fk_items_order',
      columns: ['order_id'],
      refTable: 'orders',
      refColumns: ['id'],
      refSchema: 'public',
      onDelete: 'CASCADE',
    })
  })

  it('groups composite foreign keys by constraint name', () => {
    const tables = [{ name: 'child', schema: 'public' }]
    const fks = [
      { table: 'child', column: 'a', foreign_key_table: 'parent', foreign_key_column: 'x', foreign_key_schema: 'public', constraint_name: 'fk_comp', on_update: null, on_delete: 'CASCADE' as const },
      { table: 'child', column: 'b', foreign_key_table: 'parent', foreign_key_column: 'y', foreign_key_schema: 'public', constraint_name: 'fk_comp', on_update: null, on_delete: 'CASCADE' as const },
    ]

    const schema = mapInspectorSchema('ds', tables, [], fks)

    const child = schema.tables[0]
    expect(child.foreignKeys).toHaveLength(1)
    expect(child.foreignKeys![0]).toMatchObject({ name: 'fk_comp', columns: ['a', 'b'], refColumns: ['x', 'y'], onDelete: 'CASCADE' })
  })
})

describe('DatabaseIntrospector', () => {
  it('throws for unsupported tdengine dialect', async () => {
    const introspector = new DatabaseIntrospector()
    const fakeKnex = {} as Knex
    await expect(introspector.introspect(fakeKnex, 'tdengine', 'ds')).rejects.toThrow(/暂不支持 tdengine/)
  })
})