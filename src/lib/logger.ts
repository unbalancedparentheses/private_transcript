/**
 * Simple logging utility with conditional debug output
 * Enable debug logs by setting DEBUG=true in localStorage or via env
 */

const isDebugEnabled = (): boolean => {
  // Check localStorage for debug flag (with safety check for test environments)
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG') === 'true') {
      return true;
    }
  } catch {
    // localStorage may not be available in test environments
  }
  // Check for development mode
  if (import.meta.env.DEV) {
    return true;
  }
  return false;
};

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

// In-memory log storage
const MAX_LOG_ENTRIES = 500;
const logEntries: LogEntry[] = [];
const logListeners: Set<(entries: LogEntry[]) => void> = new Set();

const notifyListeners = () => {
  logListeners.forEach(listener => listener([...logEntries]));
};

const addLogEntry = (level: LogLevel, message: string, options?: LogOptions) => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: options?.context,
    data: options?.data,
  };
  logEntries.push(entry);
  // Keep only last MAX_LOG_ENTRIES entries
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.shift();
  }
  notifyListeners();
};

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
    addLogEntry('debug', message, options);
    if (!isDebugEnabled()) return;
    const formatted = formatMessage('debug', message, options);
    console.log(formatted, options?.data ?? '');
  },

  /**
   * Info level logging - only shown when DEBUG is enabled
   */
  info: (message: string, options?: LogOptions): void => {
    addLogEntry('info', message, options);
    if (!isDebugEnabled()) return;
    const formatted = formatMessage('info', message, options);
    console.info(formatted, options?.data ?? '');
  },

  /**
   * Warning level logging - always shown
   */
  warn: (message: string, options?: LogOptions): void => {
    addLogEntry('warn', message, options);
    const formatted = formatMessage('warn', message, options);
    console.warn(formatted, options?.data ?? '');
  },

  /**
   * Error level logging - always shown
   */
  error: (message: string, options?: LogOptions): void => {
    addLogEntry('error', message, options);
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

  /**
   * Get all log entries
   */
  getEntries: (): LogEntry[] => {
    return [...logEntries];
  },

  /**
   * Subscribe to log updates
   */
  subscribe: (listener: (entries: LogEntry[]) => void): (() => void) => {
    logListeners.add(listener);
    // Return unsubscribe function
    return () => logListeners.delete(listener);
  },

  /**
   * Clear all log entries
   */
  clear: (): void => {
    logEntries.length = 0;
    notifyListeners();
  },
};

export default logger;
