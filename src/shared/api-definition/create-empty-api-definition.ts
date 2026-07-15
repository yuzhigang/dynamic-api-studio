import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

export function createEmptyApiDefinition(overrides: Partial<ApiDefinitionDraft> = {}): ApiDefinitionDraft {
  const { projectId = 'project_order', ...restOverrides } = overrides

  return {
    projectId,
    status: 'draft',
    name: '订单查询接口',
    path: '/api/v1/order/query',
    method: 'POST',
    tags: ['订单', '查询', '内部接口'],
    permissions: ['订单', '查询', '内部接口'],
    requireAuth: true,
    description: '根据条件查询订单及详情，返回分页结果。',
    bodyContentType: 'x-www-form-urlencoded',
    requestParams: [
      {
        id: 'param_page_no',
        name: 'pageNo',
        location: 'body',
        type: 'integer',
        required: true,
        example: '1',
        description: '页码，从 1 开始',
      },
      {
        id: 'param_page_size',
        name: 'pageSize',
        location: 'body',
        type: 'integer',
        required: true,
        example: '10',
        description: '每页数量',
      },
      {
        id: 'param_status',
        name: 'status',
        location: 'body',
        type: 'string',
        required: false,
        example: 'PAID,UNPAYED',
        description: '订单状态，可多选',
      },
      {
        id: 'param_start_time',
        name: 'startTime',
        location: 'body',
        type: 'string',
        required: false,
        example: '2024-06-01 00:00:00',
        description: '开始时间',
      },
      {
        id: 'param_end_time',
        name: 'endTime',
        location: 'body',
        type: 'string',
        required: false,
        example: '2024-06-07 23:59:59',
        description: '结束时间',
      },
      {
        id: 'param_customer_name',
        name: 'customerName',
        location: 'body',
        type: 'string',
        required: false,
        example: '张三',
        description: '客户名称',
      },
      {
        id: 'param_sort_field',
        name: 'sortField',
        location: 'body',
        type: 'string',
        required: false,
        example: 'create_time',
        description: '排序字段',
      },
      {
        id: 'param_sort_order',
        name: 'sortOrder',
        location: 'body',
        type: 'string',
        required: false,
        example: 'desc',
        description: '排序方式：asc、desc',
      },
    ],
    responseSchema: [
      {
        id: 'schema_code',
        name: 'code',
        type: 'integer',
        required: true,
        description: '状态码',
      },
      {
        id: 'schema_msg',
        name: 'msg',
        type: 'string',
        required: true,
        description: '提示信息',
      },
      {
        id: 'schema_data',
        name: 'data',
        type: 'object',
        required: true,
        description: '返回数据',
        children: [
          {
            id: 'schema_data_list',
            name: 'list',
            type: 'array',
            required: true,
            description: '订单列表',
            children: [
              {
                id: 'schema_order_no',
                name: 'orderNo',
                type: 'string',
                required: true,
                description: '订单编号',
              },
              {
                id: 'schema_customer_name',
                name: 'customerName',
                type: 'string',
                required: true,
                description: '客户名称',
              },
              {
                id: 'schema_total_amount',
                name: 'totalAmount',
                type: 'decimal',
                required: true,
                description: '订单金额',
              },
            ],
          },
        ],
      },
    ],
    localVariables: [],
    workflowSteps: [
      {
        id: 'step_order_main',
        kind: 'sql-query',
        title: '查询订单主表',
        datasourceId: 'orderMainDb',
        outputVariable: 'orderMain',
        sql: `SELECT
  om.order_id, om.order_no, om.customer_name, om.total_amount,
  om.status, om.create_time
FROM
  order_main om
WHERE 1=1
  #if status != null
  AND om.status IN ($status)
  #end
ORDER BY om.create_time DESC
LIMIT $(pageSize) OFFSET $((pageNo - 1) * pageSize)`,
      },
      {
        id: 'step_order_detail',
        kind: 'sql-query',
        title: '查询订单明细',
        datasourceId: 'orderDetailDb',
        outputVariable: 'orderItems',
        sql: `SELECT
  od.order_id, od.product_id, od.product_name, od.quantity, od.price
FROM
  order_detail od
WHERE od.order_id IN ($orderMain.order_id)`,
      },
      {
        id: 'step_product',
        kind: 'sql-query',
        title: '查询商品信息',
        datasourceId: 'productDb',
        outputVariable: 'productMap',
        sql: `SELECT
  p.product_id, p.product_name, p.sku, p.unit
FROM
  product p
WHERE p.product_id IN ($orderItems.product_id)`,
      },
      {
        id: 'step_assemble',
        kind: 'js-transform',
        title: '结果组装（最后一步）',
        outputVariable: 'data',
        script: `const orderMap = new Map();
orderMain.forEach((om) => orderMap.set(om.order_id, { ...om, items: [] }));

orderItems.forEach((oi) => {
  const list = orderMap.get(oi.order_id)?.items ?? [];
  list.push({ ...oi, product: productMap[oi.product_id] ?? null });
});

return {
  list: Array.from(orderMap.values()),
};`,
      },
    ],
    ...restOverrides,
  }
}
