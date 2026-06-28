import { describe, expect, it } from 'vitest'

import { filterEmptyItems, removeListItem } from '@/modules/variables/utils/string-list'

describe('string-list', () => {
  it('removes an item by index', () => {
    expect(removeListItem(['a', 'b', 'c'], 1)).toEqual(['a', 'c'])
  })

  it('trims and drops empty/whitespace items', () => {
    expect(filterEmptyItems([' a ', '', '  ', 'b'])).toEqual(['a', 'b'])
  })
})
