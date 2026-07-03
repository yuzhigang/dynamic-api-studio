import { describe, expect, it } from 'vitest'
import { buildApiVariableContext } from '@/server/workflow/variable-context-builder'

describe('buildApiVariableContext', () => {
  it('evaluates local variables in dependency order', () => {
    const context = buildApiVariableContext({
      input: { pageSize: 10, pageNo: 2 },
      global: {},
      localVariables: [
        {
          id: 'v1',
          name: 'pageSize',
          type: 'integer',
          mode: 'required',
          value: { kind: 'expression', expression: '$input.pageSize' },
        },
        {
          id: 'v2',
          name: 'offset',
          type: 'integer',
          mode: 'required',
          value: { kind: 'expression', expression: '($pageSize - 1) * $input.pageNo' },
        },
      ],
    })

    expect(context.get('local', 'offset')?.value).toBe(18)
  })

  it('uses literal values directly', () => {
    const context = buildApiVariableContext({
      input: {},
      global: {},
      localVariables: [
        {
          id: 'v1',
          name: 'limit',
          type: 'integer',
          mode: 'required',
          value: { kind: 'literal', literal: 20 },
        },
      ],
    })

    expect(context.get('local', 'limit')?.value).toBe(20)
  })

  it('detects circular dependencies', () => {
    expect(() =>
      buildApiVariableContext({
        input: {},
        global: {},
        localVariables: [
          {
            id: 'v1',
            name: 'a',
            type: 'integer',
            mode: 'required',
            value: { kind: 'expression', expression: '$b' },
          },
          {
            id: 'v2',
            name: 'b',
            type: 'integer',
            mode: 'required',
            value: { kind: 'expression', expression: '$a' },
          },
        ],
      }),
    ).toThrow('circular')
  })

  it('preserves input and global values', () => {
    const context = buildApiVariableContext({
      input: { id: 1 },
      global: { tenantId: 't-123' },
      localVariables: [],
    })

    expect(context.get('input', 'id')?.value).toBe(1)
    expect(context.get('global', 'tenantId')?.value).toBe('t-123')
  })
})
