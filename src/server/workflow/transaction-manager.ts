import type { Knex } from 'knex'

/** Open a knex transaction for the given datasource pool. */
export async function openTransaction(knex: Knex): Promise<Knex.Transaction> {
  return knex.transaction()
}

export async function commit(trx: Knex.Transaction): Promise<void> {
  await trx.commit()
}

export async function rollback(trx: Knex.Transaction): Promise<void> {
  await trx.rollback()
}