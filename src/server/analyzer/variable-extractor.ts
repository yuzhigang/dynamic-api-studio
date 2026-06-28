export type SqlVariableReference = {
  raw: string
  name: string
  mode: 'required' | 'optional' | 'defaulted'
}

export function extractVariablesFromSql(sql: string): SqlVariableReference[] {
  return Array.from(sql.matchAll(/\$([a-zA-Z_][\w.]*)([?!])?/g)).map((match) => ({
    raw: match[0],
    name: match[1] ?? '',
    mode: match[2] === '?' ? 'optional' : match[2] === '!' ? 'defaulted' : 'required',
  }))
}
