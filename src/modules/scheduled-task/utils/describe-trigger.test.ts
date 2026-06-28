import { describe, expect, it } from 'vitest'

import { describeTrigger, isValidCron } from '@/modules/scheduled-task/utils/describe-trigger'

describe('describeTrigger', () => {
  it('describes an interval trigger in Chinese', () => {
    expect(describeTrigger({ mode: 'interval', every: 5, unit: 'minute' })).toBe('每 5 分钟')
    expect(describeTrigger({ mode: 'interval', every: 2, unit: 'hour' })).toBe('每 2 小时')
    expect(describeTrigger({ mode: 'interval', every: 1, unit: 'day' })).toBe('每 1 天')
  })

  it('describes a cron trigger', () => {
    expect(describeTrigger({ mode: 'cron', expression: '0 2 * * *' })).toBe('Cron：0 2 * * *')
  })
})

describe('isValidCron', () => {
  it('accepts 5-segment expressions', () => {
    expect(isValidCron('0 2 * * *')).toBe(true)
  })

  it('rejects wrong segment counts and empty', () => {
    expect(isValidCron('0 2 * *')).toBe(false)
    expect(isValidCron('')).toBe(false)
    expect(isValidCron('   ')).toBe(false)
  })
})
