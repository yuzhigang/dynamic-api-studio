import { describe, expect, it } from 'vitest'

import {
  buildCompletions,
  snapshotFromSymbols,
  type VariableContextSnapshot,
} from '@/components/editors/extensions/variable-completion'
import type { SymbolItem } from '@/components/editors/build-symbol-store'

function findLabel(completions: ReturnType<typeof buildCompletions>, label: string) {
  return completions.find((c) => c.label === label)
}

describe('buildCompletions', () => {
  it('produces input, global and local completions with correct details', () => {
    const snapshot: VariableContextSnapshot = {
      input: ['status'],
      global: ['region'],
      local: [{ name: 'offset', type: 'integer', source: 'design' }],
    }

    const completions = buildCompletions(snapshot)

    expect(findLabel(completions, '$input.status')).toMatchObject({
      type: 'variable',
      detail: 'input',
    })
    expect(findLabel(completions, '$.region')).toMatchObject({
      type: 'variable',
      detail: 'global',
    })
    expect(findLabel(completions, '$offset')).toMatchObject({
      type: 'variable',
      detail: 'local (design)',
    })
  })

  it('emits both $name and $name[]. completions for array-typed local variables', () => {
    const snapshot: VariableContextSnapshot = {
      input: [],
      global: [],
      local: [{ name: 'orders', type: 'array', source: 'step' }],
    }

    const completions = buildCompletions(snapshot)

    expect(findLabel(completions, '$orders')).toMatchObject({
      type: 'variable',
      detail: 'local (step)',
    })
    expect(findLabel(completions, '$orders[].')).toMatchObject({
      type: 'property',
      detail: 'array property',
    })
  })

  it('preserves optional ? / ! suffixes in completion labels', () => {
    const snapshot: VariableContextSnapshot = {
      input: ['status?'],
      global: ['region!'],
      local: [{ name: 'offset?', type: 'integer', source: 'design' }],
    }

    const completions = buildCompletions(snapshot)

    expect(findLabel(completions, '$input.status?')).toBeDefined()
    expect(findLabel(completions, '$.region!')).toBeDefined()
    expect(findLabel(completions, '$offset?')).toBeDefined()
  })
})

describe('snapshotFromSymbols', () => {
  it('converts SymbolItem[] into a VariableContextSnapshot', () => {
    const symbols: SymbolItem[] = [
      { label: '$input.status?', detail: 'string', source: 'input' },
      { label: '$.region!', detail: 'string', source: 'global' },
      { label: '$orders', detail: 'array', source: 'step', type: 'array' },
      { label: '$offset', detail: 'integer', source: 'design', type: 'integer' },
    ]

    const snapshot = snapshotFromSymbols(symbols)

    expect(snapshot.input).toEqual(['status?'])
    expect(snapshot.global).toEqual(['region!'])
    expect(snapshot.local).toEqual([
      { name: 'orders', type: 'array', source: 'step' },
      { name: 'offset', type: 'integer', source: 'design' },
    ])
  })
})
