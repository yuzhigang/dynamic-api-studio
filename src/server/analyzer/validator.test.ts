import { describe, expect, it } from 'vitest'
import { validateVariableReferences } from '@/server/analyzer/validator'
import type { VariableReference } from '@/server/analyzer/types'

function makeRef(partial: Partial<VariableReference> & { raw: string }, from = 0): VariableReference {
  return {
    from,
    to: from + partial.raw.length,
    scope: partial.scope ?? 'global',
    name: partial.name ?? partial.raw.replace(/^[$.]+/, '').replace(/[?!]$/, ''),
    fullPath: partial.fullPath ?? partial.raw.replace(/[?!]$/, ''),
    mode: partial.mode ?? 'required',
    sqlKind: partial.sqlKind ?? 'value',
    dataType: partial.dataType ?? 'string',
    astPath: partial.astPath ?? [],
    ...partial,
  } as VariableReference
}

describe('validateVariableReferences', () => {
  it('reports unknown global variables', () => {
    const refs: VariableReference[] = [
      makeRef({ raw: '$.unknown', scope: 'global', name: 'unknown', fullPath: '$.unknown', mode: 'required' }),
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: ['known'] })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('unknown')
  })

  it('reports missing default for defaulted mode', () => {
    const refs: VariableReference[] = [
      makeRef({ raw: '$.pageSize!', scope: 'global', name: 'pageSize', fullPath: '$.pageSize', mode: 'defaulted', dataType: 'integer' }),
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: ['pageSize'], defaults: {} })
    expect(diagnostics[0].message).toContain('默认值')
  })

  it('returns empty diagnostics for valid references', () => {
    const refs: VariableReference[] = [
      makeRef({ raw: '$.region', scope: 'global', name: 'region', fullPath: '$.region', mode: 'required' }),
      makeRef({ raw: '$input.status', scope: 'input', name: 'status', fullPath: '$input.status', mode: 'required' }),
    ]
    const diagnostics = validateVariableReferences(refs, {
      inputNames: ['status'],
      globalNames: ['region'],
    })
    expect(diagnostics).toHaveLength(0)
  })

  it('reports function call patterns', () => {
    const refs: VariableReference[] = [
      makeRef({ raw: '$.getMin(1, 2)', scope: 'global', name: 'getMin(1, 2)', fullPath: '$.getMin(1, 2)', mode: 'required' }),
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: [] })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('函数调用')
  })

  it('reports unknown input variables', () => {
    const refs: VariableReference[] = [
      makeRef({ raw: '$input.missing', scope: 'input', name: 'missing', fullPath: '$input.missing', mode: 'required' }),
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: ['known'], globalNames: [] })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('输入参数')
    expect(diagnostics[0].message).toContain('missing')
  })

  it('accepts falsy-but-defined defaults', () => {
    const refs: VariableReference[] = [
      makeRef({ raw: '$.pageSize!', scope: 'global', name: 'pageSize', fullPath: '$.pageSize', mode: 'defaulted', dataType: 'integer' }),
    ]

    // default = 0
    let diagnostics = validateVariableReferences(refs, {
      inputNames: [],
      globalNames: ['pageSize'],
      defaults: { pageSize: 0 },
    })
    expect(diagnostics).toHaveLength(0)

    // default = false
    diagnostics = validateVariableReferences(refs, {
      inputNames: [],
      globalNames: ['pageSize'],
      defaults: { pageSize: false },
    })
    expect(diagnostics).toHaveLength(0)

    // default = ""
    diagnostics = validateVariableReferences(refs, {
      inputNames: [],
      globalNames: ['pageSize'],
      defaults: { pageSize: '' },
    })
    expect(diagnostics).toHaveLength(0)
  })

  it('accumulates multiple errors in one call', () => {
    const refs: VariableReference[] = [
      makeRef({ raw: '$.a', scope: 'global', name: 'a', fullPath: '$.a', mode: 'required' }),
      makeRef({ raw: '$input.b', scope: 'input', name: 'b', fullPath: '$input.b', mode: 'required' }),
      makeRef({ raw: '$.c!', scope: 'global', name: 'c', fullPath: '$.c', mode: 'defaulted' }),
    ]
    const diagnostics = validateVariableReferences(refs, {
      inputNames: [],
      globalNames: [],
      defaults: {},
    })
    expect(diagnostics).toHaveLength(3)
    expect(diagnostics[0].message).toContain('a')
    expect(diagnostics[1].message).toContain('b')
    expect(diagnostics[2].message).toContain('c')
  })

  it('preserves source positions in diagnostics', () => {
    const refs: VariableReference[] = [makeRef({ raw: '$.unknown', scope: 'global', name: 'unknown' }, 15)]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: ['known'] })
    expect(diagnostics[0]).toMatchObject({ from: 15, to: 24 })
  })
})
