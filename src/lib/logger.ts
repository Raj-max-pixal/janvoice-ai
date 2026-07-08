/**
 * logger.ts — Centralized logging for JanVoice AI
 *
 * Levels: debug, info, warn, error
 * In production, debug logs are suppressed unless ?debug=true is in the URL.
 * All logs include timestamps and module tags.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isProduction = import.meta.env.PROD
const isDebugMode = () =>
  !isProduction || new URLSearchParams(window.location.search).has('debug')

function formatMessage(level: LogLevel, module: string, message: string, data?: unknown): string {
  const ts = new Date().toISOString()
  const tag = `[${ts}] [${level.toUpperCase()}] [${module}]`
  return data ? `${tag} ${message} ${JSON.stringify(data)}` : `${tag} ${message}`
}

function log(level: LogLevel, module: string, message: string, data?: unknown): void {
  if (level === 'debug' && !isDebugMode()) return

  const formatted = formatMessage(level, module, message, data)

  switch (level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export const logger = {
  debug: (module: string, message: string, data?: unknown) => log('debug', module, message, data),
  info: (module: string, message: string, data?: unknown) => log('info', module, message, data),
  warn: (module: string, message: string, data?: unknown) => log('warn', module, message, data),
  error: (module: string, message: string, data?: unknown) => log('error', module, message, data),
}