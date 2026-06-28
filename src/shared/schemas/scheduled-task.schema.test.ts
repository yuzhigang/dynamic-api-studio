import { describe, expect, it } from 'vitest'

import {
  scheduledTaskDraftSchema,
  triggerSchema,
} from '@/shared/schemas/scheduled-task.schema'

describe('scheduled-task schema', () => {
  it('accepts a cron trigger', () => {
    expect(triggerSchema.parse({ mode: 'cron', expression: '0 2 * * *' })).toEqual({
      mode: 'cron',
      expression: '0 2 * * *',
    })
  })

  it('accepts an interval trigger', () => {
    expect(
      triggerSchema.parse({ mode: 'interval', every: 5, unit: 'minute' }),
    ).toEqual({ mode: 'interval', every: 5, unit: 'minute' })
  })

  it('rejects interval every < 1', () => {
    expect(() => triggerSchema.parse({ mode: 'interval', every: 0, unit: 'minute' })).toThrow()
  })

  it('rejects a draft without name', () => {
    expect(() =>
      scheduledTaskDraftSchema.parse({
        enabled: true,
        dataSourceId: 'ds_pg',
        sql: 'select 1',
        trigger: { mode: 'cron', expression: '* * * * *' },
      }),
    ).toThrow()
  })

  it('accepts a valid draft', () => {
    const draft = {
      name: '每日清理',
      enabled: true,
      dataSourceId: 'ds_pg',
      sql: 'delete from tmp',
      trigger: { mode: 'interval' as const, every: 1, unit: 'day' as const },
    }
    expect(scheduledTaskDraftSchema.parse(draft)).toMatchObject(draft)
  })
})
