import type {
  DataSource,
  DataSourceDraft,
  TestConnectionResult,
} from '@/shared/contracts/data-source.contract'

const now = '2026-06-27T00:00:00.000Z'

const seedDataSources: DataSource[] = [
  {
    id: 'ds_order_oracle',
    name: '订单库（Oracle）',
    dialect: 'oracle',
    host: '10.10.0.21',
    port: 1521,
    database: 'ORCLPDB1',
    username: 'mes',
    password: '******',
    description: '订单中心主库，订单、明细、商品数据',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'ds_crm_postgres',
    name: '客户库（PostgreSQL）',
    dialect: 'postgresql',
    host: '10.10.0.32',
    port: 5432,
    database: 'crm',
    username: 'crm_app',
    password: '******',
    description: '客户档案与画像数据',
    createdAt: now,
    updatedAt: now,
  },
]

export class DataSourceRepository {
  private dataSources = new Map(seedDataSources.map((dataSource) => [dataSource.id, dataSource]))

  list() {
    return Array.from(this.dataSources.values())
  }

  get(dataSourceId: string) {
    return this.dataSources.get(dataSourceId)
  }

  save(draft: DataSourceDraft) {
    const timestamp = new Date().toISOString()
    const id = draft.id ?? `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const existing = this.dataSources.get(id)
    const dataSource: DataSource = {
      id,
      name: draft.name,
      dialect: draft.dialect,
      host: draft.host,
      port: draft.port,
      database: draft.database,
      username: draft.username,
      password: draft.password,
      description: draft.description,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    this.dataSources.set(id, dataSource)
    return dataSource
  }

  remove(dataSourceId: string) {
    return this.dataSources.delete(dataSourceId)
  }

  testConnection(draft: DataSourceDraft): TestConnectionResult {
    const latencyMs = 20 + Math.floor(Math.random() * 80)

    if (!draft.host.trim() || !draft.database.trim()) {
      return {
        success: false,
        message: '连接失败：请填写主机地址和数据库名称',
        latencyMs,
      }
    }

    return {
      success: true,
      message: `连接成功（${draft.dialect} @ ${draft.host}:${draft.port}）`,
      latencyMs,
    }
  }
}
