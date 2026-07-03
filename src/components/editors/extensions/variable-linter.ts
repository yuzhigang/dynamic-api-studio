import { linter } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'

import type { SymbolItem } from '@/components/editors/build-symbol-store'

function normalizeVariableReference(raw: string): string {
  // Input / global references keep their prefix and only strip a trailing ?/!.
  if (raw.startsWith('$input.') || raw.startsWith('$.')) {
    return raw.replace(/[?!]$/, '')
  }

  // Local references normalize to the base variable name:
  // $orders?[].id  ->  $orders
  return raw
    .replace(/[?!]/g, '')
    .replace(/\[\]/g, '')
    .replace(/\.[a-zA-Z_][\w.]*/g, '')
}

export function variableLinter(symbols: SymbolItem[]): Extension {
  const validLabels = new Set(symbols.map((symbol) => symbol.label.replace(/[?!]$/, '')))

  return linter((view) => {
    const diagnostics = []
    const source = view.state.doc.toString()
    const pattern = /\$[a-zA-Z_][\w.?![\]]*/g

    for (const match of source.matchAll(pattern)) {
      const raw = match[0]
      const normalized = normalizeVariableReference(raw)

      if (!validLabels.has(normalized) && !normalized.startsWith('$(')) {
        diagnostics.push({
          from: match.index ?? 0,
          to: (match.index ?? 0) + raw.length,
          severity: 'warning' as const,
          message: `变量 ${raw} 暂未在当前上下文中定义`,
        })
      }
    }

    return diagnostics
  })
}
