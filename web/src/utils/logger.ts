/**
 * Production-safe logger utility
 *
 * In production builds (import.meta.env.PROD === true):
 * - debug() and log() calls are no-ops
 * - warn() and error() still output for monitoring
 *
 * In development:
 * - All methods output normally
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug-level logging - silenced in production
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.log("[DEBUG]", ...args);
    }
  },

  /**
   * General logging - silenced in production
   */
  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info-level logging - silenced in production
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Warning-level logging - kept in production for monitoring
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },

  /**
   * Error-level logging - kept in production for monitoring
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};

export default logger;
