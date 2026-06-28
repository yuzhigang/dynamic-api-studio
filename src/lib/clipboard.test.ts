import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyJsonToClipboard } from '@/lib/clipboard'

describe('copyJsonToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('copies consistently formatted JSON', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await copyJsonToClipboard({ status: 'success', count: 2 })

    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ status: 'success', count: 2 }, null, 2),
    )
  })

  it('rejects when the Clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })

    await expect(copyJsonToClipboard({})).rejects.toThrow('当前浏览器不支持剪贴板复制')
  })
})
