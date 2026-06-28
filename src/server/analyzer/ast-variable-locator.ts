import type { VariableRef } from '@/server/analyzer/types'

export type AstVariableLocation = {
  raw: string
  astPath: string[]
}

const VARIABLE_PATTERN = /\$([a-zA-Z_][\w.]*)|:(\w+)/g

export function locateVariablesInAst(ast: unknown): AstVariableLocation[] {
  const locations: AstVariableLocation[] = []

  function walk(node: unknown, path: string[]) {
    if (node === null || node === undefined || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...path, String(index)]))
      return
    }

    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string') {
        // Check for :param values (node-sql-parser uses "param" type)
        if (value === 'param') {
          // This is a type marker, look for sibling "value" key
          const parent = node as Record<string, unknown>
          if ('value' in parent) {
            const paramValue = parent.value
            if (typeof paramValue === 'string') {
              locations.push({
                raw: ':' + paramValue,
                astPath: [...path, 'value'],
              })
            }
          }
        }
        const match = value.match(VARIABLE_PATTERN)
        if (match) {
          locations.push({
            raw: match[0],
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
