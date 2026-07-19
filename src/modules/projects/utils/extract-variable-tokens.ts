export type VariableToken = {
  raw: string
  name: string
  optional: boolean
  defaulted: boolean
}

const variablePattern = /\$([a-zA-Z_][\w.]*)([?!])?/g

export function extractVariableTokens(source: string): VariableToken[] {
  return Array.from(source.matchAll(variablePattern)).map((match) => ({
    raw: match[0],
    name: match[1] ?? '',
    optional: match[2] === '?',
    defaulted: match[2] === '!',
  }))
}
