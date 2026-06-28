import type { AstVariableLocation } from '@/server/analyzer/types'

const PLACEHOLDER_PATTERN = /^__var_(\d+)__$/

export function locateVariablesInAst(ast: unknown): AstVariableLocation[] {
  const locations: AstVariableLocation[] = []

  function walk(node: unknown, path: string[]) {
    if (node === null || node === undefined || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...path, String(index)]))
      return
    }

    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string') {
        const match = value.match(PLACEHOLDER_PATTERN)
        if (match) {
          locations.push({
            raw: `__var_${match[1]}__`,
            astPath: [...path, key],
          })
        }
      } else if (typeof value === 'object') {
        walk(value, [...path, key])
      }
    }
  }

  walk(ast, [])
  return locations
}
