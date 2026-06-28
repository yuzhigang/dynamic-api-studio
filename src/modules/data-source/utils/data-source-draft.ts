import type { DataSource, DataSourceDraft } from '@/shared/contracts/data-source.contract'

export function createEmptyDataSourceDraft(): DataSourceDraft {
  return {
    name: '新数据源',
    dialect: 'postgresql',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    description: '',
  }
}

export function toDraft(dataSource: DataSource): DataSourceDraft {
  return {
    id: dataSource.id,
    name: dataSource.name,
    dialect: dataSource.dialect,
    host: dataSource.host,
    port: dataSource.port,
    database: dataSource.database,
    username: dataSource.username,
    password: dataSource.password,
    description: dataSource.description,
  }
}
