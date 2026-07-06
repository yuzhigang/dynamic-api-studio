import { describe, expect, it } from 'vitest'

import { getVariableDiagnostics } from '@/components/editors/extensions/variable-linter'
import type { SymbolItem } from '@/components/editors/build-symbol-store'

const baseSymbols: SymbolItem[] = [
  { label: '$input.x', detail: 'input', source: 'input' },
  { label: '$.x', detail: 'global', source: 'global' },
  { label: '$local', detail: 'local', source: 'design' },
  { label: '$orders', detail: 'local', source: 'design', type: 'array' },
  { label: '$orders[].id', detail: 'array property', source: 'design', type: 'integer' },
]

function warnings(source: string, symbols = baseSymbols) {
  return getVariableDiagnostics(source, symbols)
}

describe('getVariableDiagnostics', () => {
  it('passes valid input, global and local references', () => {
    const source = 'WHERE $input.x = 1 AND $.x = 2 AND $local = 3 AND id IN ($orders[].id)'
    expect(warnings(source)).toHaveLength(0)
  })

  it('passes local references with optional/defaulted suffixes', () => {
    expect(warnings('WHERE $orders? AND $orders!')).toHaveLength(0)
  })

  it('warns about unknown local variables', () => {
    const diagnostics = warnings('WHERE $unknownLocal = 1')
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('$unknownLocal')
    expect(diagnostics[0].severity).toBe('warning')
  })

  it('warns about unknown input variables', () => {
    const diagnostics = warnings('WHERE $input.unknown = 1')
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('$input.unknown')
  })

  it('warns about unknown global variables', () => {
    const diagnostics = warnings('WHERE $.unknown = 1')
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('$.unknown')
  })

  it('ignores function-call expressions like $(...)', () => {
    expect(warnings('LIMIT $(pageSize)')).toHaveLength(0)
  })

  it('recognizes array-property local when the full property path is in the symbol list', () => {
    const symbols: SymbolItem[] = [
      { label: '$orders[].id', detail: 'array property', source: 'design', type: 'integer' },
    ]
    expect(warnings('WHERE id IN ($orders[].id)', symbols)).toHaveLength(0)
  })
})
