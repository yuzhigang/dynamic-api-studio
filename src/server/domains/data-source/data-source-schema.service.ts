import type { DataSourceSchema, DataSourceSchemaTable } from '@/shared/contracts/data-source.contract'

/**
 * 数据源 schema 服务：返回业务数据源的表/列/外键/索引结构，驱动 SQL 编辑器补全与「schema」详情 tab。
 *
 * 当前为 mock（order_main / order_detail，columns 含 length/precision/scale/defaultValue/autoIncrement，
 * 表级含 foreignKeys/indexes/comment，对齐 db-model §6 增强结构）。未来接入真探测（经 KnexRegistry 连业务库
 * 查 information_schema）并把结果落 `db_schema` 缓存表、读缓存优先——届时本服务改为读 db_schema。
 */
const MOCK_TABLES: DataSourceSchemaTable[] = [
  {
    name: 'order_main',
    comment: '订单主表',
    columns: [
      { name: 'order_id', dataType: 'bigint', nullable: false, isPrimaryKey: true, autoIncrement: true, ordinalPosition: 1, comment: '订单 ID' },
      { name: 'order_no', dataType: 'varchar', length: 64, nullable: false, isPrimaryKey: false, ordinalPosition: 2, comment: '订单编号' },
      { name: 'customer_name', dataType: 'varchar', length: 128, nullable: true, isPrimaryKey: false, ordinalPosition: 3, comment: '客户名称' },
      { name: 'total_amount', dataType: 'decimal', precision: 12, scale: 2, nullable: true, isPrimaryKey: false, ordinalPosition: 4, comment: '订单金额' },
      { name: 'create_time', dataType: 'datetime', nullable: true, isPrimaryKey: false, defaultValue: 'now()', ordinalPosition: 5, comment: '创建时间' },
    ],
    indexes: [
      { name: 'pk_order_main', columns: ['order_id'], unique: true, primary: true },
      { name: 'idx_order_main_order_no', columns: ['order_no'], unique: true, primary: false },
    ],
    foreignKeys: [],
  },
  {
    name: 'order_detail',
    comment: '订单明细',
    columns: [
      { name: 'order_id', dataType: 'bigint', nullable: false, isPrimaryKey: true, ordinalPosition: 1 },
      { name: 'product_id', dataType: 'bigint', nullable: false, isPrimaryKey: true, ordinalPosition: 2 },
      { name: 'quantity', dataType: 'integer', nullable: true, isPrimaryKey: false, defaultValue: '1', ordinalPosition: 3 },
      { name: 'price', dataType: 'decimal', precision: 10, scale: 2, nullable: true, isPrimaryKey: false, ordinalPosition: 4 },
    ],
    indexes: [
      { name: 'pk_order_detail', columns: ['order_id', 'product_id'], unique: true, primary: true },
      { name: 'idx_order_detail_order_id', columns: ['order_id'], unique: false, primary: false },
    ],
    foreignKeys: [
      { name: 'fk_order_detail_order', columns: ['order_id'], refTable: 'order_main', refColumns: ['order_id'], onDelete: 'CASCADE' },
    ],
  },
]

export class DataSourceSchemaService {
  getDataSourceSchema(datasourceId: string): DataSourceSchema {
    return { datasourceId, tables: MOCK_TABLES }
  }
}