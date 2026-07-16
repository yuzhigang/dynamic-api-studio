import '@/server/infra/db/config' // 触发 dotenv 加载 .env，使下方 dbAvailable 判定准确

import type { Kysely } from 'kysely'

import type { Database } from '@/server/infra/db/tables'

/**
 * 平台元数据库是否已配置（存在 PLATFORM_DB_HOST 即视为可用）。
 * 用于在测试中门控 DB 集成用例：有 .env（开发者/有库环境）→ 跑；无 → 跳过，保持离线 `pnpm test` 仍绿。
 */
export const dbAvailable = !!process.env.PLATFORM_DB_HOST

const ROLLBACK = Symbol('rollback')

/**
 * 在一个事务里执行 fn，结束后强制回滚——DB 集成测试隔离用：不污染库、不留累积数据。
 * fn 的返回值会被保留并返回（回滚只撤销 DB 写入，不影响 JS 返回值）。
 *
 * 用法：
 * ```ts
 * await withRollback(platformDb, async (trx) => {
 *   const repo = new ProjectRepository(trx)
 *   expect(await repo.canCreateApi('project_order')).toBe(true)
 * })
 * ```
 */
export async function withRollback<T>(
  db: Kysely<Database>,
  fn: (trx: Kysely<Database>) => Promise<T>,
): Promise<T> {
  let result: T | undefined
  try {
    await db.transaction().execute(async (trx) => {
      result = await fn(trx)
      throw ROLLBACK
    })
  } catch (error) {
    if (error !== ROLLBACK) throw error
  }
  return result as T
}