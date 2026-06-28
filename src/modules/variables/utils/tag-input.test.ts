import { describe, expect, it } from 'vitest'

import { commitTag } from '@/modules/variables/utils/tag-input'

describe('commitTag', () => {
  it('appends a trimmed token', () => {
    expect(commitTag(['a'], '  b  ')).toEqual(['a', 'b'])
  })

  it('ignores empty or whitespace-only input', () => {
    expect(commitTag(['a'], '   ')).toEqual(['a'])
    expect(commitTag(['a'], '')).toEqual(['a'])
  })

  it('deduplicates existing tokens', () => {
    expect(commitTag(['a', 'b'], 'a')).toEqual(['a', 'b'])
  })
})
