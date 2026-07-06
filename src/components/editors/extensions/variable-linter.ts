import { linter } from '@codemirror/lint'
import type { Diagnostic } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'

import type { SymbolItem } from '@/components/editors/build-symbol-store'

function getReferenceCandidates(raw: string): string[] {
  const candidates = new Set<string>()

  // Candidate 1: strip a single trailing ?/! suffix.
  candidates.add(raw.replace(/[?!]$/, ''))

  // For local references, also allow matching the base variable name,
  // so $orders[].id is recognized when either $orders or $orders[].id
  // is declared in the symbol list.
  if (!raw.startsWith('$input.') && !raw.startsWith('$.')) {
    candidates.add(
      raw
        .replace(/[?!]/g, '')
        .replace(/\[\]/g, '')
        .replace(/\.[a-zA-Z_][\w.]*/g, ''),
    )
  }

  return Array.from(candidates)
}

export function getVariableDiagnostics(source: string, symbols: SymbolItem[]): Diagnostic[] {
  const validLabels = new Set(symbols.map((symbol) => symbol.label.replace(/[?!]$/, '')))
  const diagnostics: Diagnostic[] = []
  const pattern = /\$[a-zA-Z_.][\w.?![\]]*/g

  for (const match of source.matchAll(pattern)) {
    const raw = match[0]
    const candidates = getReferenceCandidates(raw)

    if (!candidates.some((candidate) => validLabels.has(candidate)) && !raw.startsWith('$(')) {
      diagnostics.push({
        from: match.index ?? 0,
        to: (match.index ?? 0) + raw.length,
        severity: 'warning',
        message: `变量 ${raw} 暂未在当前上下文中定义`,
      })
    }
  }

  return diagnostics
}

export function variableLinter(symbols: SymbolItem[]): Extension {
  return linter((view) => getVariableDiagnostics(view.state.doc.toString(), symbols))
}
