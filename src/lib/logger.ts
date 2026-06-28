type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function write(level: LogLevel, message: string, payload?: unknown) {
  if (import.meta.env.PROD && level === 'debug') {
    return
  }

  const method = level === 'debug' ? 'log' : level
  console[method](`[${level}] ${message}`, payload ?? '')
}

export const logger = {
  debug: (message: string, payload?: unknown) => write('debug', message, payload),
  info: (message: string, payload?: unknown) => write('info', message, payload),
  warn: (message: string, payload?: unknown) => write('warn', message, payload),
  error: (message: string, payload?: unknown) => write('error', message, payload),
}
