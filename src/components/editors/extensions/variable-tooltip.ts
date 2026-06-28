import { hoverTooltip } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

import type { SymbolItem } from '@/components/editors/build-symbol-store'

export function variableTooltip(symbols: SymbolItem[]): Extension {
  return hoverTooltip((view, pos) => {
    const line = view.state.doc.lineAt(pos)
    const before = line.text.slice(0, pos - line.from)
    const after = line.text.slice(pos - line.from)
    const prefix = before.match(/\$[\w.?!]*$/)?.[0] ?? ''
    const suffix = after.match(/^[\w.?!]*/)?.[0] ?? ''
    const token = `${prefix}${suffix}`.replace(/[?!]$/, '')
    const symbol = symbols.find((item) => item.label.replace(/[?!]$/, '') === token)

    if (!symbol) {
      return null
    }

    const dom = document.createElement('div')
    dom.className = 'rounded-md bg-white px-3 py-2 text-xs text-slate-700 shadow-panel'
    dom.textContent = symbol.detail

    return {
      pos: pos - prefix.length,
      end: pos + suffix.length,
      above: true,
      create: () => ({ dom }),
    }
  })
}
