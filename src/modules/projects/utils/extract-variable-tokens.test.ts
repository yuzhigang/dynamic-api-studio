import { describe, expect, it } from 'vitest'

import { extractVariableTokens } from '@/modules/projects/utils/extract-variable-tokens'

describe('extractVariableTokens', () => {
  it('extracts required, optional, and defaulted SQL variables', () => {
    const tokens = extractVariableTokens(
      'WHERE tenant_id = $ctx.tenantId AND status IN $status? LIMIT $pageSize!',
    )

    expect(tokens).toEqual([
      {
        raw: '$ctx.tenantId',
        name: 'ctx.tenantId',
        optional: false,
        defaulted: false,
      },
      {
        raw: '$status?',
        name: 'status',
        optional: true,
        defaulted: false,
      },
      {
        raw: '$pageSize!',
        name: 'pageSize',
        optional: false,
        defaulted: true,
      },
    ])
  })
})
