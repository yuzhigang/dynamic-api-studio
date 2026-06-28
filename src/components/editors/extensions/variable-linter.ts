import { linter } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'

import type { SymbolItem } from '@/components/editors/build-symbol-store'

export function variableLinter(symbols: SymbolItem[]): Extension {
  const validLabels = new Set(symbols.map((symbol) => symbol.label.replace(/[?!]$/, '')))

  return linter((view) => {
    const diagnostics = []
    const source = view.state.doc.toString()
    const pattern = /\$(input|\.)([a-zA-Z_][\w.]*)([?!])?/g

    for (const match of source.matchAll(pattern)) {
      const raw = match[0]
      const normalized = raw.replace(/[?!]$/, '')

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
