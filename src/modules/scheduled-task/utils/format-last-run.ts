const lastRunFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Shanghai',
})

export function formatLastRun(isoString?: string) {
  if (!isoString) {
    return '未运行'
  }

  const normalized = isoString.replace(' ', 'T')
  const zonedValue = /(Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : `${normalized}+08:00`

  return lastRunFormatter.format(new Date(zonedValue))
}
