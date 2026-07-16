import 'dotenv/config'

/**
 * 平台元数据库（platform metadata store）连接配置。
 *
 * 该库用于存储项目、API、数据源、变量、函数、日志等平台自身元数据，
 * 与 {@link ../knex/knex-registry} 管理的「用户业务数据源」是两套不同的连接。
 *
 * 所有连接参数从环境变量读取（.env），避免把凭据硬编码进仓库。
 * 变量清单见 .env.example。
 */

export interface PlatformDbConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  /** 连接池最小空闲连接数。 */
  poolMin: number
  /** 连接池最大连接数。 */
  poolMax: number
}

function required(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(
      `[platform-db] 缺少必需环境变量 ${name}。请在项目根目录 .env 中配置平台元数据库连接（参见 .env.example）。`,
    )
  }
  return value
}

function nonNegativeInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`[platform-db] 环境变量 ${name} 必须为非负整数，实际值为 ${raw}`)
  }
  return parsed
}

/** 读取并校验平台元数据库连接配置。 */
export function loadPlatformDbConfig(): PlatformDbConfig {
  return {
    host: required('PLATFORM_DB_HOST'),
    port: nonNegativeInt('PLATFORM_DB_PORT', 5432),
    database: required('PLATFORM_DB_NAME'),
    user: required('PLATFORM_DB_USER'),
    password: required('PLATFORM_DB_PASSWORD'),
    poolMin: nonNegativeInt('PLATFORM_DB_POOL_MIN', 0),
    poolMax: nonNegativeInt('PLATFORM_DB_POOL_MAX', 10),
  }
}

/** 返回脱敏的连接描述，用于日志输出（不暴露密码）。 */
export function describePlatformDb(cfg: PlatformDbConfig): string {
  return `postgres://${cfg.user}:***@${cfg.host}:${cfg.port}/${cfg.database}`
}