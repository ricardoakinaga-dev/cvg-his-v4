import { trace } from '@opentelemetry/api';
import { nowIso } from '@cvg-his-v2/shared-utils';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogContext {
  readonly service?: string;
  readonly correlationId?: string;
  readonly requestId?: string;
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

const REDACTED = '[REDACTED]';
const CIRCULAR_VALUE = '[CIRCULAR]';
const MAX_SANITIZE_DEPTH = 8;

const SENSITIVE_KEY_PATTERN =
  /(?:pass(?:word|phrase)?|secret|token|authorization|cookie|api[-_]?key|client[-_]?secret|access[-_]?token|refresh[-_]?token|id[-_]?token|private[-_]?key|webhook[-_]?signature)/i;

const SENSITIVE_TEXT_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /(\b(?:password|passphrase|secret|token|authorization|api[-_]?key|client[-_]?secret|access[-_]?token|refresh[-_]?token)\b\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g
];

function sanitizeString(value: string): string {
  let sanitized = value;
  for (const pattern of SENSITIVE_TEXT_PATTERNS) {
    sanitized = sanitized.replace(pattern, (_match, prefix: unknown) =>
      typeof prefix === 'string' ? `${prefix}${REDACTED}` : REDACTED
    );
  }
  return sanitized;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function sanitizeValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return sanitizeString(value);
  if (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'symbol' || typeof value === 'function') return String(value);
  if (depth >= MAX_SANITIZE_DEPTH) return REDACTED;

  if (value instanceof Error) {
    return sanitizeValue(serializeError(value), depth + 1, seen);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return REDACTED;

  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return CIRCULAR_VALUE;
  seen.add(value);

  let sanitized: unknown;
  if (Array.isArray(value)) {
    sanitized = value.map((item) => sanitizeValue(item, depth + 1, seen));
  } else {
    const record: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      record[key] = isSensitiveKey(key) ? REDACTED : sanitizeValue(entry, depth + 1, seen);
    }
    sanitized = record;
  }

  seen.delete(value);
  return sanitized;
}

function sanitizeContext(context?: LogContext): Record<string, unknown> {
  if (!context) return {};
  const value = sanitizeValue(context);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const sanitized = value as Record<string, unknown>;

  const correlationId =
    typeof sanitized.correlationId === 'string' ? sanitized.correlationId : undefined;
  const requestId = typeof sanitized.requestId === 'string' ? sanitized.requestId : undefined;

  if (correlationId && !requestId) {
    sanitized.requestId = correlationId;
  }

  if (requestId && !correlationId) {
    sanitized.correlationId = requestId;
  }

  return sanitized;
}

function getTraceLogContext(): Record<string, unknown> {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) {
    return {};
  }

  const spanContext = activeSpan.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags
  };
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const sanitized = sanitizeContext(context);
  const payload = {
    level,
    message: sanitizeString(message),
    timestamp: nowIso(),
    pid: process.pid,
    ...getTraceLogContext(),
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
