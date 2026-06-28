const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Shanghai',
})

const dateTimeWithoutYearFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Shanghai',
})

function toZonedDate(isoString: string) {
  const normalized = isoString.replace(' ', 'T')
  const zonedValue = /(Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : `${normalized}+08:00`

  return new Date(zonedValue)
}

export function formatDateTime(isoString: string) {
  return dateTimeFormatter.format(toZonedDate(isoString))
}

export function formatDateTimeWithoutYear(isoString: string) {
  return dateTimeWithoutYearFormatter.format(toZonedDate(isoString))
}
