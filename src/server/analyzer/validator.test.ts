import { describe, expect, it } from 'vitest'
import { validateVariableReferences } from '@/server/analyzer/validator'
import type { VariableRef } from '@/server/analyzer/types'

function makeRef(partial: Partial<VariableRef> & { raw: string }, from = 0): VariableRef {
  return {
    from,
    to: from + partial.raw.length,
    namespace: partial.namespace ?? 'global',
    name: partial.name ?? partial.raw.replace(/^[\$.]+/, '').replace(/[?!]$/, ''),
    fullPath: partial.fullPath ?? partial.raw.replace(/[?!]$/, ''),
    mode: partial.mode ?? 'required',
    sqlKind: partial.sqlKind ?? 'value',
    dataType: partial.dataType ?? 'string',
    astPath: partial.astPath ?? [],
    ...partial,
  } as VariableRef
}

describe('validateVariableReferences', () => {
  it('reports unknown global variables', () => {
    const refs: VariableRef[] = [
      makeRef({ raw: '$.unknown', namespace: 'global', name: 'unknown', fullPath: '$.unknown', mode: 'required' }),
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: ['known'] })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('unknown')
  })

  it('reports missing default for defaulted mode', () => {
    const refs: VariableRef[] = [
      makeRef({ raw: '$.pageSize!', namespace: 'global', name: 'pageSize', fullPath: '$.pageSize', mode: 'defaulted', dataType: 'integer' }),
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: ['pageSize'], defaults: {} })
    expect(diagnostics[0].message).toContain('默认值')
  })

  it('returns empty diagnostics for valid references', () => {
    const refs: VariableRef[] = [
      makeRef({ raw: '$.region', namespace: 'global', name: 'region', fullPath: '$.region', mode: 'required' }),
      makeRef({ raw: '$input.status', namespace: 'input', name: 'status', fullPath: '$input.status', mode: 'required' }),
    ]
    const diagnostics = validateVariableReferences(refs, {
      inputNames: ['status'],
      globalNames: ['region'],
    })
    expect(diagnostics).toHaveLength(0)
  })

  it('reports function call patterns', () => {
    const refs: VariableRef[] = [
      makeRef({ raw: '$.getMin(1, 2)', namespace: 'global', name: 'getMin(1, 2)', fullPath: '$.getMin(1, 2)', mode: 'required' }),
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: [] })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('函数调用')
  })

  it('reports unknown input variables', () => {
    const refs: VariableRef[] = [
      makeRef({ raw: '$input.missing', namespace: 'input', name: 'missing', fullPath: '$input.missing', mode: 'required' }),
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: ['known'], globalNames: [] })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('输入参数')
    expect(diagnostics[0].message).toContain('missing')
  })

  it('accepts falsy-but-defined defaults', () => {
    const refs: VariableRef[] = [
      makeRef({ raw: '$.pageSize!', namespace: 'global', name: 'pageSize', fullPath: '$.pageSize', mode: 'defaulted', dataType: 'integer' }),
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
    const refs: VariableRef[] = [
      makeRef({ raw: '$.a', namespace: 'global', name: 'a', fullPath: '$.a', mode: 'required' }),
      makeRef({ raw: '$input.b', namespace: 'input', name: 'b', fullPath: '$input.b', mode: 'required' }),
      makeRef({ raw: '$.c!', namespace: 'global', name: 'c', fullPath: '$.c', mode: 'defaulted' }),
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
    const refs: VariableRef[] = [makeRef({ raw: '$.unknown', namespace: 'global', name: 'unknown' }, 15)]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: ['known'] })
    expect(diagnostics[0]).toMatchObject({ from: 15, to: 24 })
  })
})
