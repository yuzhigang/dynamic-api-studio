import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'

import type { SymbolItem } from '@/components/editors/build-symbol-store'

export type VariableContextSnapshot = {
  input: string[]
  global: string[]
  local: Array<{ name: string; type: string; source: 'design' | 'step' }>
}

export function buildCompletions(snapshot: VariableContextSnapshot): Completion[] {
  const completions: Completion[] = []

  for (const name of snapshot.input) {
    completions.push({
      label: `$input.${name}`,
      type: 'variable',
      detail: 'input',
      apply: `$input.${name}`,
    })
  }

  for (const name of snapshot.global) {
    completions.push({
      label: `$.${name}`,
      type: 'variable',
      detail: 'global',
      apply: `$.${name}`,
    })
  }

  for (const variable of snapshot.local) {
    completions.push({
      label: `$${variable.name}`,
      type: 'variable',
      detail: `local (${variable.source})`,
      apply: `$${variable.name}`,
    })

    if (variable.type === 'array') {
      completions.push({
        label: `$${variable.name}[].`,
        type: 'property',
        detail: 'array property',
        apply: `$${variable.name}[].`,
      })
    }
  }

  return completions
}

function createCompletionSource(options: Completion[]) {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/\$[\w.?![\]]*/)

    if (!word && !context.explicit) {
      return null
    }

    return {
      from: word?.from ?? context.pos,
      options,
    }
  }
}

export function variableCompletionFromSnapshot(snapshot: VariableContextSnapshot): Extension {
  return autocompletion({
    override: [createCompletionSource(buildCompletions(snapshot))],
  })
}

function extractName(label: string, prefix: string): string {
  return label.startsWith(prefix) ? label.slice(prefix.length) : label
}

export function snapshotFromSymbols(symbols: SymbolItem[]): VariableContextSnapshot {
  const input: string[] = []
  const global: string[] = []
  const local: VariableContextSnapshot['local'] = []

  for (const symbol of symbols) {
    if (symbol.source === 'input') {
      const name = extractName(symbol.label, '$input.')
      if (name) input.push(name)
    } else if (symbol.source === 'global') {
      const name = extractName(symbol.label, '$.')
      if (name) global.push(name)
    } else {
      const name = extractName(symbol.label, '$')
      if (name) {
        local.push({
          name,
          type: symbol.type ?? '',
          source: symbol.source === 'design' ? 'design' : 'step',
        })
      }
    }
  }

  return { input, global, local }
}

/**
 * Completion extension for `$variable` references (request params, upstream
 * step results, global variables, and API design-time local variables).
 *
 * Internally converts the legacy {@link SymbolItem} list into a
 * {@link VariableContextSnapshot}. New callers can use
 * {@link variableCompletionFromSnapshot} directly.
 */
export function variableCompletion(symbols: SymbolItem[]): Extension {
  return variableCompletionFromSnapshot(snapshotFromSymbols(symbols))
}
