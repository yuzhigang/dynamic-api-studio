import { describe, expect, it } from 'vitest'
import { dialectToKnexClient, mapParserDialect, toKnexConfig } from '@/server/workflow/datasource-config'
import type { DataSource } from '@/shared/contracts/data-source.contract'

function ds(dialect: DataSource['dialect']): DataSource {
  return {
    id: 'ds1', name: 'n', dialect, host: 'h', port: 5432, database: 'd',
    username: 'u', password: 'p', createdAt: 't', updatedAt: 't',
  }
}

describe('datasource-config', () => {
  it('maps dialects to knex clients', () => {
    expect(dialectToKnexClient.postgresql).toBe('pg')
    expect(dialectToKnexClient.mysql).toBe('mysql2')
    expect(dialectToKnexClient.sqlserver).toBe('mssql')
    expect(dialectToKnexClient.oracle).toBe('oracledb')
  })

  it('maps tdengine to postgresql for the parser', () => {
    expect(mapParserDialect('tdengine')).toBe('postgresql')
    expect(mapParserDialect('mysql')).toBe('mysql')
  })

  it('builds a Knex DataSourceConfig', () => {
    expect(toKnexConfig(ds('postgresql'))).toEqual({
      id: 'ds1', client: 'pg', connection: { host: 'h', port: 5432, user: 'u', password: 'p', database: 'd' },
    })
  })
})