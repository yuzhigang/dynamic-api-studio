import { Parser } from 'node-sql-parser'

const parser = new Parser()

export function parseSql(sql: string, database = 'Postgresql') {
  return parser.astify(sql, { database })
}
