/**
 * Structured logging configuration using Pino.
 *
 * Usage:
 *   import { logger } from './logger';
 *
 *   logger.info({ orderId: 'ORD-1234', items: 3 }, 'processing_order');
 *   logger.warn({ endpoint: '/api/v1', usagePct: 85 }, 'rate_limit_approaching');
 *   logger.error({ orderId: 'ORD-1234', error: 'card_declined' }, 'payment_failed');
 *
 * Environment Variables:
 *   NODE_ENV: Set to "production" for JSON output (default: development/pretty)
 *   LOG_LEVEL: trace, debug, info, warn, error, fatal (default: info)
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Pretty-print in development, raw JSON in production
  transport: !isProduction
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: true } }
    : undefined,

  // Redact sensitive fields from all log output
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'ssn',
      'creditCard',
    ],
    censor: '[REDACTED]',
  },

  // Standard base fields included in every log entry
  base: {
    service: process.env.SERVICE_NAME || undefined,
    version: process.env.npm_package_version || undefined,
  },

  // ISO timestamps in production, epoch in dev (pino-pretty handles formatting)
  timestamp: isProduction ? pino.stdTimeFunctions.isoTime : true,
});

/**
 * Create a child logger with bound context.
 * Useful for adding request-scoped or module-scoped fields.
 *
 * @example
 *   const reqLogger = createChildLogger({ requestId: 'abc-123', userId: 42 });
 *   reqLogger.info('handling request');
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
