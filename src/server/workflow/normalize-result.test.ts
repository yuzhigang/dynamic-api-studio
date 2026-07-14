import { describe, expect, it } from 'vitest'
import { normalizeResult } from '@/server/workflow/normalize-result'

describe('normalizeResult', () => {
  it('reads rows from a pg result', () => {
    expect(normalizeResult({ rows: [{ id: 1 }], rowCount: 1 }, 'pg')).toEqual([{ id: 1 }])
  })

  it('reads the first element of a mysql2 [rows, fields] result', () => {
    expect(normalizeResult([[{ id: 1 }, { id: 2 }], [{ name: 'id' }]], 'mysql2')).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('reads recordset from a mssql result', () => {
    expect(normalizeResult({ recordset: [{ id: 1 }] }, 'mssql')).toEqual([{ id: 1 }])
  })

  it('reads rows from an oracledb result', () => {
    expect(normalizeResult({ rows: [{ id: 1 }] }, 'oracledb')).toEqual([{ id: 1 }])
  })

  it('returns an array fallback for unknown clients/shapes', () => {
    expect(normalizeResult([{ id: 1 }], 'tdengine')).toEqual([{ id: 1 }])
    expect(normalizeResult(undefined, 'pg')).toEqual([])
  })
})