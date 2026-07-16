import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

import { describePlatformDb, loadPlatformDbConfig } from '@/server/infra/db/config'
import type { Database } from '@/server/infra/db/tables'

/**
 * 平台元数据库的 Kysely 实例（单例）。
 *
 * 构造时不建立连接：`pool` 以函数形式提供，连接池在首次查询时才创建，
 * 因此 import 本模块本身不会读取环境变量或发起网络连接——
 * 在测试或未配置 `.env` 的环境里 import 是安全的。
 *
 * 用法：
 * ```ts
 * import { platformDb as db } from '@/server/infra/db/db'
 * const rows = await db.selectFrom('project').selectAll().execute()
 * ```
 *
 * 与 {@link ../knex/knex-registry} 区分：后者按 `db_source.id` 管理用户业务库的
 * 动态多方言连接池；本实例是平台自身元数据的单一固定 PostgreSQL 连接。
 */
export const platformDb = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: async () => {
      const cfg = loadPlatformDbConfig()
      if (process.env.PLATFORM_DB_LOG === 'true') {
        console.log(`[platform-db] 连接 ${describePlatformDb(cfg)}`)
      }
      return new Pool({
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        user: cfg.user,
        password: cfg.password,
        min: cfg.poolMin,
        max: cfg.poolMax,
      })
    },
  }),
})

/** 关闭连接池。用于测试清理 / 进程退出。 */
export async function closePlatformDb(): Promise<void> {
  await platformDb.destroy()
}