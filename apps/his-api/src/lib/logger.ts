import type { FastifyServerOptions } from 'fastify';

type LoggerLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

function resolveLogLevel(): LoggerLevel {
  const level = process.env.LOG_LEVEL;

  if (
    level === 'fatal' ||
    level === 'error' ||
    level === 'warn' ||
    level === 'info' ||
    level === 'debug' ||
    level === 'trace' ||
    level === 'silent'
  ) {
    return level;
  }

  return 'info';
}

export function buildLoggerOptions(): FastifyServerOptions['logger'] {
  return {
    level: resolveLogLevel(),
    messageKey: 'message',
    base: {
      service: 'his-api'
    },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'headers.authorization', 'headers.cookie'],
      remove: true
    }
  };
}
