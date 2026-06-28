export type SqlClause = 'select' | 'from' | 'where' | 'order-by' | 'unknown'

export function detectClauseAtCursor(): SqlClause {
  return 'unknown'
}
