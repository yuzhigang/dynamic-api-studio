const formatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Shanghai',
})

/**
 * 项目时间展示格式：忽略年份、精确到秒，输出 `MM-DD HH:mm:ss`。
 * 接受 ISO 字符串或 `YYYY-MM-DD HH:mm:ss`，无法解析时原样返回。
 */
export function formatProjectTime(value: string): string {
  const normalized = value.replace(' ', 'T')
  const zoned = /(Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : `${normalized}+08:00`
  const date = new Date(zoned)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  )

  return `${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}
