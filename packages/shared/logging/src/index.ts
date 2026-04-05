import { nowIso } from '@cvg-his-v2/shared-utils';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogContext {
  readonly service?: string;
  readonly correlationId?: string;
  readonly tenantId?: string;
  readonly accountId?: string;
  readonly userId?: string;
  readonly [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  fatal(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toUpperCase();
  if (env && env in LOG_LEVEL_PRIORITY) return env as LogLevel;
  if (process.env.NODE_ENV === 'production') return 'INFO';
  return 'DEBUG';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getMinLevel()];
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const e = err as unknown as Record<string, unknown>;
    return {
      errorType: err.constructor.name,
      message: err.message,
      stack: err.stack,
      code: e.code,
      statusCode: e.statusCode
    };
  }
  if (typeof err === 'object' && err !== null) {
    return err as Record<string, unknown>;
  }
  return { value: String(err) };
}

function sanitize(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const sensitivePatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    /password["\s:]+\S+/gi,
    /token["\s:]+\S+/gi,
    /secret["\s:]+\S+/gi,
    /authorization["\s:]+\S+/gi
  ];
  let sanitized = value;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

function sanitizeContext(context?: LogContext): Record<string, unknown> {
  if (!context) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (key === 'error') {
      sanitized[key] = serializeError(value);
    } else if (key === 'payload' || key === 'body' || key === 'headers') {
      sanitized[key] = sanitize(String(value));
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const sanitized = sanitizeContext(context);
  const payload = {
    level,
    message,
    timestamp: nowIso(),
    pid: process.pid,
    ...sanitized
  };

  const line = JSON.stringify(payload);

  if (level === 'ERROR' || level === 'FATAL') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

class StructuredLogger implements Logger {
  private readonly defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
  }

  debug(message: string, context?: LogContext): void {
    write('DEBUG', message, { ...this.defaultContext, ...context });
  }

  info(message: string, context?: LogContext): void {
    write('INFO', message, { ...this.defaultContext, ...context });
  }

  warn(message: string, context?: LogContext): void {
    write('WARN', message, { ...this.defaultContext, ...context });
  }

  error(message: string, context?: LogContext): void {
    write('ERROR', message, { ...this.defaultContext, ...context });
  }

  fatal(message: string, context?: LogContext): void {
    write('FATAL', message, { ...this.defaultContext, ...context });
  }

  child(context: LogContext): Logger {
    return new StructuredLogger({ ...this.defaultContext, ...context });
  }
}

export function createLogger(service: string): Logger {
  return new StructuredLogger({ service });
}

export function createChildLogger(logger: Logger, context: LogContext): Logger {
  if ('child' in logger && typeof logger.child === 'function') {
    return (logger as StructuredLogger).child(context);
  }
  return new StructuredLogger(context);
}
