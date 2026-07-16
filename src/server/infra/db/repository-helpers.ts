import { sql, type RawBuilder } from 'kysely'

/**
 * jsonb 数组写库辅助。
 *
 * pg 对 JS 数组按 PG 数组格式序列化（如 `{"a","b"}`），并非 JSON；直接把数组绑到 jsonb 列会报
 * `Expected ":", but found ","`。这里先 `JSON.stringify` 成字符串再 `cast(... as jsonb)`，
 * 读库时 pg 自动 JSON.parse 回 JS 数组。
 *
 * 对象类 jsonb（content/trigger/request_params 等）不需要此辅助——pg 会自动 stringify 对象。
 * 仅数组列（items/tags/permissions/columns/workflow_steps/steps/params）写库时用它。
 */
export function jsonbArray<T>(value: T[] | null): RawBuilder<T[] | null> {
  return sql`cast(${JSON.stringify(value)} as jsonb)` as unknown as RawBuilder<T[] | null>
}

/**
 * jsonb 任意值写库辅助（对象/数组/原始值通用）。
 *
 * pg 对顶层数组按 PG 数组格式序列化（非 JSON），对象虽自动 stringify，但为统一与安全（值可能是数组），
 * 一律 `JSON.stringify` 后 `cast(... as jsonb)`；读时 pg 自动 parse。`undefined` 视为 `null`。
 */
export function jsonbValue(value: unknown): RawBuilder<unknown> {
  return sql`cast(${JSON.stringify(value ?? null)} as jsonb)` as unknown as RawBuilder<unknown>
}