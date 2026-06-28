import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'

import type { SymbolItem } from '@/components/editors/build-symbol-store'

export function variableCompletion(symbols: SymbolItem[]): Extension {
  const options: Completion[] = symbols.map((symbol) => ({
    label: symbol.label,
    detail: symbol.detail,
    type: symbol.source === 'step' ? 'variable' : 'constant',
    apply: symbol.label,
  }))

  return autocompletion({
    override: [
      (context: CompletionContext) => {
        const word = context.matchBefore(/\$[\w.?!]*/)

        if (!word && !context.explicit) {
          return null
        }

        return {
          from: word?.from ?? context.pos,
          options,
        }
      },
    ],
  })
}
