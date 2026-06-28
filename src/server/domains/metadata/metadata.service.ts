export class MetadataService {
  getDatasourceMetadata(datasourceId: string) {
    return {
      datasourceId,
      tables: [
        {
          name: 'order_main',
          columns: [
            { name: 'order_id', type: 'bigint', comment: '订单 ID' },
            { name: 'order_no', type: 'varchar', comment: '订单编号' },
            { name: 'customer_name', type: 'varchar', comment: '客户名称' },
            { name: 'total_amount', type: 'decimal', comment: '订单金额' },
            { name: 'create_time', type: 'datetime', comment: '创建时间' },
          ],
        },
        {
          name: 'order_detail',
          columns: [
            { name: 'order_id', type: 'bigint' },
            { name: 'product_id', type: 'bigint' },
            { name: 'quantity', type: 'integer' },
            { name: 'price', type: 'decimal' },
          ],
        },
      ],
    }
  }
}
