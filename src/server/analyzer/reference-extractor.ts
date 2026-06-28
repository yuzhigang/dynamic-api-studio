export function extractStepReferences(sql: string) {
  return Array.from(sql.matchAll(/\$([a-zA-Z_][\w.]*)/g)).map((match) => match[1] ?? '')
}
