import { describe, expect, it, vi } from 'vitest'
import type { Knex } from 'knex'
import { commit, openTransaction, rollback } from '@/server/workflow/transaction-manager'

function fakeKnex(trx: Partial<Knex.Transaction>) {
  const knex = { transaction: vi.fn() } as unknown as Knex
  ;(knex.transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation((cb?: (t: Knex.Transaction) => unknown) => {
    if (cb) return cb(trx as Knex.Transaction)
    return Promise.resolve(trx)
  })
  return knex
}

describe('transaction-manager', () => {
  it('opens a transaction via knex.transaction', async () => {
    const trx = { commit: vi.fn(), rollback: vi.fn() } as unknown as Knex.Transaction
    const knex = fakeKnex(trx)
    const opened = await openTransaction(knex)
    expect(opened).toBe(trx)
  })

  it('commits a transaction', async () => {
    const trx = { commit: vi.fn().mockResolvedValue(undefined), rollback: vi.fn() } as unknown as Knex.Transaction
    await commit(trx)
    expect(trx.commit).toHaveBeenCalledTimes(1)
    expect(trx.rollback).not.toHaveBeenCalled()
  })

  it('rolls back a transaction', async () => {
    const trx = { commit: vi.fn(), rollback: vi.fn().mockResolvedValue(undefined) } as unknown as Knex.Transaction
    await rollback(trx)
    expect(trx.rollback).toHaveBeenCalledTimes(1)
    expect(trx.commit).not.toHaveBeenCalled()
  })
})