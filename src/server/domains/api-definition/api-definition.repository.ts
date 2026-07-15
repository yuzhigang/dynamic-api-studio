import type {
  ApiDefinitionDraft,
  ApiDefinitionSummary,
} from '@/shared/contracts/api-definition.contract'
import { createEmptyApiDefinition } from '@/shared/api-definition/create-empty-api-definition'

const initialSummaries: ApiDefinitionSummary[] = [
  {
    id: 'api_order_query',
    projectId: 'project_order',
    name: '订单查询接口',
    path: '/api/v1/order/query',
    method: 'POST',
    status: 'published',
    updatedAt: '2026-06-27 14:30:00',
  },
  {
    id: 'api_order_detail',
    projectId: 'project_order',
    name: '订单详情接口',
    path: '/api/v1/order/detail',
    method: 'GET',
    status: 'published',
    updatedAt: '2026-06-27 14:18:00',
  },
  {
    id: 'api_customer_query',
    projectId: 'project_order',
    name: '客户查询接口',
    path: '/api/v1/customer/query',
    method: 'POST',
    status: 'draft',
    updatedAt: '2026-06-27 13:52:00',
  },
  {
    id: 'api_product_query',
    projectId: 'project_order',
    name: '商品查询接口',
    path: '/api/v1/product/query',
    method: 'POST',
    status: 'published',
    updatedAt: '2026-06-27 13:40:00',
  },
  {
    id: 'api_stock_query',
    projectId: 'project_order',
    name: '库存查询接口',
    path: '/api/v1/stock/query',
    method: 'POST',
    status: 'draft',
    updatedAt: '2026-06-27 12:35:00',
  },
  {
    id: 'api_report_internal',
    projectId: 'project_order',
    name: '内部报表接口',
    path: '/api/v1/report/internal',
    method: 'GET',
    status: 'published',
    updatedAt: '2026-06-27 11:20:00',
  },
]

const initialDrafts: ApiDefinitionDraft[] = [
  createEmptyApiDefinition({
    id: 'api_order_query',
    projectId: 'project_order',
    status: 'published',
    requireAuth: false,
  }),
  createEmptyApiDefinition({
    id: 'api_order_detail',
    projectId: 'project_order',
    status: 'published',
    requireAuth: false,
    name: '订单详情接口',
    path: '/api/v1/order/detail',
    method: 'GET',
    tags: ['订单', '详情'],
    permissions: ['order.read'],
    description: '按订单编号或订单 ID 查询订单详情。',
  }),
  createEmptyApiDefinition({
    id: 'api_customer_query',
    projectId: 'project_order',
    name: '客户查询接口',
    path: '/api/v1/customer/query',
    method: 'POST',
    tags: ['客户', '查询'],
    permissions: ['customer.read'],
    description: '按客户名称、手机号和会员等级查询客户信息。',
  }),
  createEmptyApiDefinition({
    id: 'api_product_query',
    projectId: 'project_order',
    status: 'published',
    requireAuth: false,
    name: '商品查询接口',
    path: '/api/v1/product/query',
    method: 'POST',
    tags: ['商品', '查询'],
    permissions: ['product.read'],
    description: '查询商品基础信息、SKU 和上下架状态。',
  }),
  createEmptyApiDefinition({
    id: 'api_stock_query',
    projectId: 'project_order',
    name: '库存查询接口',
    path: '/api/v1/stock/query',
    method: 'POST',
    tags: ['库存', '查询'],
    permissions: ['stock.read'],
    description: '查询仓库库存余量和锁定库存。',
  }),
  createEmptyApiDefinition({
    id: 'api_report_internal',
    projectId: 'project_order',
    status: 'published',
    requireAuth: false,
    name: '内部报表接口',
    path: '/api/v1/report/internal',
    method: 'GET',
    tags: ['报表', '内部接口'],
    permissions: ['report.read'],
    description: '内部运营报表查询接口。',
  }),
]

export class ApiDefinitionRepository {
  private summaries = new Map(initialSummaries.map((summary) => [summary.id, summary]))
  private drafts = new Map(initialDrafts.map((draft) => [draft.id ?? draft.path, draft]))

  list(projectId: string) {
    return Array.from(this.summaries.values()).filter((summary) => summary.projectId === projectId)
  }

  get(projectId: string, apiId: string) {
    const draft = this.drafts.get(apiId)

    if (draft?.projectId !== projectId) {
      return undefined
    }

    return draft
  }

  save(projectId: string, draft: ApiDefinitionDraft) {
    const id = draft.id ?? `api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const nextDraft = {
      ...draft,
      id,
      projectId,
    }

    this.drafts.set(id, nextDraft)

    this.summaries.set(id, {
      id,
      projectId,
      name: draft.name,
      path: draft.path,
      method: draft.method,
      status: draft.status,
      updatedAt: new Date().toISOString(),
    })

    return {
      id,
      status: draft.status,
    }
  }

  listPublished(): ApiDefinitionDraft[] {
    return Array.from(this.drafts.values()).filter((draft) => draft.status === 'published')
  }

  isPathMethodUnique(path: string, method: string, exceptId?: string): boolean {
    return !this.listPublished().some(
      (draft) => draft.path === path && draft.method === method && draft.id !== exceptId,
    )
  }
}
