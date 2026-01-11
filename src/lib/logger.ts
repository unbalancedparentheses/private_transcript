/**
 * Simple logging utility with conditional debug output
 * Enable debug logs by setting DEBUG=true in localStorage or via env
 */

const isDebugEnabled = (): boolean => {
  // Check localStorage for debug flag
  if (typeof window !== 'undefined' && localStorage.getItem('DEBUG') === 'true') {
    return true;
  }
  // Check for development mode
  if (import.meta.env.DEV) {
    return true;
  }
  return false;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: unknown;
}

const formatMessage = (level: LogLevel, message: string, options?: LogOptions): string => {
  const timestamp = new Date().toISOString();
  const context = options?.context ? `[${options.context}]` : '';
  return `${timestamp} ${level.toUpperCase()} ${context} ${message}`;
};

export const logger = {
  /**
   * Debug level logging - only shown when DEBUG is enabled
   */
  debug: (message: string, options?: LogOptions): void => {
    if (!isDebugEnabled()) return;
    const formatted = formatMessage('debug', message, options);
    console.log(formatted, options?.data ?? '');
  },

  /**
   * Info level logging - only shown when DEBUG is enabled
   */
  info: (message: string, options?: LogOptions): void => {
    if (!isDebugEnabled()) return;
    const formatted = formatMessage('info', message, options);
    console.info(formatted, options?.data ?? '');
  },

  /**
   * Warning level logging - always shown
   */
  warn: (message: string, options?: LogOptions): void => {
    const formatted = formatMessage('warn', message, options);
    console.warn(formatted, options?.data ?? '');
  },

  /**
   * Error level logging - always shown
   */
  error: (message: string, options?: LogOptions): void => {
    const formatted = formatMessage('error', message, options);
    console.error(formatted, options?.data ?? '');
  },

  /**
   * Enable debug logging
   */
  enableDebug: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('DEBUG', 'true');
    }
  },

  /**
   * Disable debug logging
   */
  disableDebug: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('DEBUG');
    }
  },
};

export default logger;
