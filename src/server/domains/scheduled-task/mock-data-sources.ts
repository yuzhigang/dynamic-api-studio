import type { MockDataSource } from '@/shared/contracts/scheduled-task.contract'

export const mockDataSources: MockDataSource[] = [
  { id: 'ds_pg', name: '主库（PostgreSQL）', dialect: 'postgresql' },
  { id: 'ds_mysql', name: '订单库（MySQL）', dialect: 'mysql' },
  { id: 'ds_report', name: '报表库（PostgreSQL）', dialect: 'postgresql' },
]
