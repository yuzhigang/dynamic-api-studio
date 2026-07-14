/** Normalize a knex.raw result into a row array across clients. */
export function normalizeResult(raw: unknown, client: string): unknown[] {
  if (raw === null || raw === undefined) return []

  if (client === 'pg' || client === 'oracledb') {
    return rowsOf((raw as { rows?: unknown[] }).rows)
  }
  if (client === 'mysql2') {
    return Array.isArray(raw) ? rowsOf(raw[0] as unknown) : []
  }
  if (client === 'mssql') {
    const recordset = (raw as { recordset?: unknown[] }).recordset
    if (Array.isArray(recordset)) return recordset
  }
  return Array.isArray(raw) ? raw : []
}

function rowsOf(rows: unknown): unknown[] {
  return Array.isArray(rows) ? rows : []
}