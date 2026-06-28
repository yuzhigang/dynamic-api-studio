import { Parser } from 'node-sql-parser'

import type { SqlDialect } from '@/server/analyzer/types'

const parser = new Parser()

const dialectMap: Record<SqlDialect, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  oracle: 'PostgreSQL', // node-sql-parser does not support Oracle; fallback to PostgreSQL parser
  sqlserver: 'TransactSQL',
}

export function toParserDialect(dialect: SqlDialect): string {
  return dialectMap[dialect] ?? 'PostgreSQL'
}

export function parseSql(sql: string, dialect: SqlDialect) {
  return parser.astify(sql, { database: toParserDialect(dialect) })
}

export function stringifyAst(ast: unknown, dialect: SqlDialect): string {
  return parser.sqlify(ast as Parameters<typeof parser.sqlify>[0], { database: toParserDialect(dialect) })
}
