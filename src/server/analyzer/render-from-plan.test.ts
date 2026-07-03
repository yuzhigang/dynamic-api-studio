import { describe, expect, it } from 'vitest'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { renderFromPlan } from '@/server/analyzer/render-from-plan'

const analyzer = new EnhancedSqlAnalyzer()

describe('renderFromPlan', () => {
  it('expands $orders[].id for IN clause', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM detail WHERE order_id IN ($orders[].id)',
      dialect: 'postgresql',
      localNames: ['orders'],
    })
    const result = renderFromPlan(plan, { input: {}, global: {}, local: { orders: [{ id: 1 }, { id: 2 }, { id: 3 }] } })

    expect(result.sql).toContain('IN (?, ?, ?)')
    expect(result.params.map((p) => p.value)).toEqual([1, 2, 3])
  })

  it('renders required variables', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id',
      dialect: 'postgresql',
      inputNames: ['id'],
    })
    const result = renderFromPlan(plan, { input: { id: 42 }, global: {},
      local: {}, })

    expect(result.sql.toLowerCase()).toContain('where')
    expect(result.params).toHaveLength(1)
    expect(result.params[0]).toEqual({ value: 42, type: 'string' })
  })

  it('removes optional condition when variable is empty', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE 1 = 1 AND status = $input.status?',
      dialect: 'postgresql',
      inputNames: ['status'],
    })
    const result = renderFromPlan(plan, { input: {}, global: {},
      local: {}, })

    expect(result.sql.toLowerCase()).not.toContain('status')
  })

  it('uses default value for defaulted variable', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users LIMIT $input.pageSize!',
      dialect: 'postgresql',
      inputNames: ['pageSize'],
      defaults: { pageSize: 10 },
    })
    const result = renderFromPlan(plan, { input: {}, global: {},
      local: {}, })

    expect(result.params[0].value).toBe(10)
  })

  it('throws when required variable is missing', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id',
      dialect: 'postgresql',
      inputNames: ['id'],
    })

    expect(() => renderFromPlan(plan, { input: {}, global: {},
      local: {}, })).toThrow('变量')
  })

  it('expands array values for IN clause', () => {
    const plan = analyzer.analyze({
      sql: "SELECT * FROM users WHERE status IN ($input.statuses)",
      dialect: 'postgresql',
      inputNames: ['statuses'],
    })
    const result = renderFromPlan(plan, { input: { statuses: ['active', 'pending'] }, global: {},
      local: {}, })

    expect(result.params).toHaveLength(2)
    expect(result.params[0]).toEqual({ value: 'active', type: 'string' })
    expect(result.params[1]).toEqual({ value: 'pending', type: 'string' })
  })

  it('resolves global variables', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE tenant_id = $.tenantId',
      dialect: 'postgresql',
      globalNames: ['tenantId'],
    })
    const result = renderFromPlan(plan, { input: {}, global: { tenantId: 't-123' },
      local: {}, })

    expect(result.params).toHaveLength(1)
    expect(result.params[0]).toEqual({ value: 't-123', type: 'string' })
  })

  it('keeps optional condition when variable is provided', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE 1 = 1 AND status = $input.status?',
      dialect: 'postgresql',
      inputNames: ['status'],
    })
    const result = renderFromPlan(plan, { input: { status: 'active' }, global: {},
      local: {}, })

    expect(result.sql.toLowerCase()).toContain('status')
    expect(result.params).toHaveLength(1)
    expect(result.params[0]).toEqual({ value: 'active', type: 'string' })
  })

  it('removes BETWEEN condition when either variable is empty', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE created_at BETWEEN $input.start? AND $input.end?',
      dialect: 'postgresql',
      inputNames: ['start', 'end'],
    })

    const result1 = renderFromPlan(plan, { input: { start: '2024-01-01' }, global: {},
      local: {}, })
    expect(result1.sql.toLowerCase()).not.toContain('between')

    const result2 = renderFromPlan(plan, { input: { end: '2024-12-31' }, global: {},
      local: {}, })
    expect(result2.sql.toLowerCase()).not.toContain('between')
  })

  it('keeps BETWEEN condition when both variables are provided', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE created_at BETWEEN $input.start? AND $input.end?',
      dialect: 'postgresql',
      inputNames: ['start', 'end'],
    })
    const result = renderFromPlan(plan, { input: { start: '2024-01-01', end: '2024-12-31' }, global: {},
      local: {}, })

    expect(result.sql.toLowerCase()).toContain('between')
    expect(result.params).toHaveLength(2)
  })

  it('removes dangling AND after optional condition removal', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id AND status = $input.status?',
      dialect: 'postgresql',
      inputNames: ['id', 'status'],
    })
    const result = renderFromPlan(plan, { input: { id: 1 }, global: {},
      local: {}, })

    expect(result.sql.toLowerCase()).toContain('where')
    expect(result.sql.toLowerCase()).not.toContain('status')
  })

  it('produces IN () for empty array (documented behavior)', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE status IN ($input.statuses)',
      dialect: 'postgresql',
      inputNames: ['statuses'],
    })

    // Empty array produces no placeholders, resulting in invalid SQL (IN ()).
    // Current behavior: renders empty expr_list; caller should validate upstream.
    const result = renderFromPlan(plan, { input: { statuses: [] }, global: {},
      local: {}, })
    expect(result.sql).toContain('IN ()')
    expect(result.params).toHaveLength(0)
  })

  it('handles nested optional conditions', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE a = $input.a? AND b = $input.b?',
      dialect: 'postgresql',
      inputNames: ['a', 'b'],
    })

    const result1 = renderFromPlan(plan, { input: { a: 1 }, global: {},
      local: {}, })
    expect(result1.sql.toLowerCase()).toContain('a')
    expect(result1.sql.toLowerCase()).not.toContain('b')

    const result2 = renderFromPlan(plan, { input: { b: 2 }, global: {},
      local: {}, })
    expect(result2.sql.toLowerCase()).not.toContain('a')
    expect(result2.sql.toLowerCase()).toContain('b')

    const result3 = renderFromPlan(plan, { input: {}, global: {},
      local: {}, })
    expect(result3.sql.toLowerCase()).not.toContain('a')
    expect(result3.sql.toLowerCase()).not.toContain('b')
  })

  it('does not mutate the original plan.ast', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id',
      dialect: 'postgresql',
      inputNames: ['id'],
    })
    const originalAst = JSON.stringify(plan.ast)

    renderFromPlan(plan, { input: { id: 1 }, global: {},
      local: {}, })
    expect(JSON.stringify(plan.ast)).toBe(originalAst)

    renderFromPlan(plan, { input: { id: 99 }, global: {},
      local: {}, })
    expect(JSON.stringify(plan.ast)).toBe(originalAst)
  })

  it('does not use default value for optional variables', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE status = $input.status?',
      dialect: 'postgresql',
      inputNames: ['status'],
      defaults: { status: 'active' },
    })

    // Optional variables are removed when empty, not filled with defaults
    const result = renderFromPlan(plan, { input: {}, global: {},
      local: {}, })
    expect(result.sql.toLowerCase()).not.toContain('status')
    expect(result.params).toHaveLength(0)
  })
})
