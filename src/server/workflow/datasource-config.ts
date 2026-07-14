import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { DataSourceConfig } from '@/server/infra/knex/knex-registry'
import type { SqlDialect } from '@/server/analyzer/types'

export const dialectToKnexClient: Record<DataSource['dialect'], string> = {
  postgresql: 'pg',
  mysql: 'mysql2',
  oracle: 'oracledb',
  sqlserver: 'mssql',
  tdengine: 'tdengine',
}

/** Map a data-source dialect to the parser dialect (tdengine uses the postgresql parser). */
export function mapParserDialect(dialect: DataSource['dialect']): SqlDialect {
  if (dialect === 'tdengine') return 'postgresql'
  return dialect
}

export function toKnexConfig(dataSource: DataSource): DataSourceConfig {
  const client = dialectToKnexClient[dataSource.dialect]
  if (!client) throw new Error(`不支持的数据源方言：${dataSource.dialect}`)
  return {
    id: dataSource.id,
    client,
    connection: {
      host: dataSource.host,
      port: dataSource.port,
      user: dataSource.username,
      password: dataSource.password,
      database: dataSource.database,
    },
  }
}