/**
 * Debug logger utility for frontend
 * Wraps console methods to only log in development mode
 * Errors are always logged for production debugging
 */

const isDev = import.meta.env.DEV;

type LogArgs = unknown[];

export const logger = {
  /**
   * Log informational messages (dev only)
   */
  log: (...args: LogArgs): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log debug messages (dev only)
   */
  debug: (...args: LogArgs): void => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log informational messages (dev only)
   */
  info: (...args: LogArgs): void => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Log warning messages (dev only)
   */
  warn: (...args: LogArgs): void => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (always, for production debugging)
   */
  error: (...args: LogArgs): void => {
    console.error(...args);
  },

  /**
   * Log with custom prefix (dev only)
   */
  tagged: (tag: string, ...args: LogArgs): void => {
    if (isDev) {
      console.log(`[${tag}]`, ...args);
    }
  }
};

export default logger;

