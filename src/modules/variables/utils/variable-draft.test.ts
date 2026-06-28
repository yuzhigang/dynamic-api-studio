import { describe, expect, it } from 'vitest'

import {
  createEmptyVariableDraft,
  normalizeVariableDraft,
  toVariableDraft,
} from '@/modules/variables/utils/variable-draft'
import type { Variable } from '@/shared/contracts/variable.contract'

describe('variable-draft', () => {
  it('creates an empty single draft', () => {
    expect(createEmptyVariableDraft()).toEqual({
      name: '',
      label: '',
      kind: 'single',
      value: '',
      items: [],
    })
  })

  it('maps a variable to an editable draft', () => {
    const variable: Variable = {
      id: 'v_1',
      name: 'foo',
      label: '富',
      kind: 'list',
      value: '',
      items: ['a', 'b'],
      createdAt: 'x',
      updatedAt: 'y',
    }

    expect(toVariableDraft(variable)).toEqual({
      id: 'v_1',
      name: 'foo',
      label: '富',
      kind: 'list',
      value: '',
      items: ['a', 'b'],
    })
  })

  it('normalizes a single draft by clearing items', () => {
    expect(
      normalizeVariableDraft({ name: 'a', label: 'A', kind: 'single', value: '20', items: ['stale'] }),
    ).toEqual({ name: 'a', label: 'A', kind: 'single', value: '20', items: [] })
  })

  it('normalizes a list draft by clearing value and trimming items', () => {
    expect(
      normalizeVariableDraft({ name: 'a', label: 'A', kind: 'list', value: 'stale', items: [' x ', '', 'y'] }),
    ).toEqual({ name: 'a', label: 'A', kind: 'list', value: '', items: ['x', 'y'] })
  })
})
