import { describe, it, expect } from 'vitest';
import {
  createChildLogger,
  createLogger,
  type LogLevel
} from '../../../packages/shared/logging/src/index.js';

describe('Structured Logger', () => {
  describe('createLogger', () => {
    it('should create a logger with all log levels', () => {
      const logger = createLogger('test-service');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.fatal).toBe('function');
      expect(typeof logger.child).toBe('function');
    });

    it('should produce JSON output with required fields', () => {
      const logs: string[] = [];
      const origStdoutWrite = process.stdout.write;
      process.stdout.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') logs.push(chunk);
        return true;
      };

      try {
        const logger = createLogger('test-svc');
        logger.info('test message', { correlationId: 'corr-123' });
        expect(logs.length).toBeGreaterThan(0);
        const entry = JSON.parse(logs[logs.length - 1]);
        expect(entry.level).toBe('INFO');
        expect(entry.message).toBe('test message');
        expect(entry.service).toBe('test-svc');
        expect(entry.correlationId).toBe('corr-123');
        expect(entry.timestamp).toBeDefined();
        expect(entry.pid).toBe(process.pid);
      } finally {
        process.stdout.write = origStdoutWrite;
      }
    });

    it('should produce ERROR output to stderr', () => {
      const logs: string[] = [];
      const origStderrWrite = process.stderr.write;
      process.stderr.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') logs.push(chunk);
        return true;
      };

      try {
        const logger = createLogger('test-svc');
        logger.error('error message', { correlationId: 'corr-456' });
        expect(logs.length).toBeGreaterThan(0);
        const entry = JSON.parse(logs[logs.length - 1]);
        expect(entry.level).toBe('ERROR');
        expect(entry.message).toBe('error message');
      } finally {
        process.stderr.write = origStderrWrite;
      }
    });
  });

  describe('child logger', () => {
    it('should inherit parent context', () => {
      const logs: string[] = [];
      const origStdoutWrite = process.stdout.write;
      process.stdout.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') logs.push(chunk);
        return true;
      };

      try {
        const logger = createLogger('parent-svc');
        const child = logger.child({ correlationId: 'child-corr', accountId: 'acc-1' });
        child.info('child message');
        const entry = JSON.parse(logs[logs.length - 1]);
        expect(entry.service).toBe('parent-svc');
        expect(entry.correlationId).toBe('child-corr');
        expect(entry.accountId).toBe('acc-1');
      } finally {
        process.stdout.write = origStdoutWrite;
      }
    });

    it('should fallback to a structured child logger when parent does not implement child()', () => {
      const logs: string[] = [];
      const origStdoutWrite = process.stdout.write;
      process.stdout.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') logs.push(chunk);
        return true;
      };

      try {
        const child = createChildLogger(
          {
            debug() {},
            info() {},
            warn() {},
            error() {},
            fatal() {}
          } as never,
          { service: 'fallback-svc', tenantId: 'tenant-1' }
        );
        child.info('fallback child message');
        const entry = JSON.parse(logs[logs.length - 1]);
        expect(entry.service).toBe('fallback-svc');
        expect(entry.tenantId).toBe('tenant-1');
      } finally {
        process.stdout.write = origStdoutWrite;
      }
    });
  });

  describe('error serialization', () => {
    it('should serialize Error objects with stack', () => {
      const logs: string[] = [];
      const origStderrWrite = process.stderr.write;
      process.stderr.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') logs.push(chunk);
        return true;
      };

      try {
        const logger = createLogger('test-svc');
        const err = new Error('test error');
        logger.error('something failed', { error: err });
        const entry = JSON.parse(logs[logs.length - 1]);
        expect(entry.error.errorType).toBe('Error');
        expect(entry.error.message).toBe('test error');
        expect(entry.error.stack).toBeDefined();
      } finally {
        process.stderr.write = origStderrWrite;
      }
    });

    it('should serialize non-Error objects passed as error context', () => {
      const logs: string[] = [];
      const origStderrWrite = process.stderr.write;
      process.stderr.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') logs.push(chunk);
        return true;
      };

      try {
        const logger = createLogger('test-svc');
        logger.error('object error', {
          error: { reason: 'upstream_failed', statusCode: 502 }
        });
        const entry = JSON.parse(logs[logs.length - 1]);
        expect(entry.error).toEqual({
          reason: 'upstream_failed',
          statusCode: 502
        });
      } finally {
        process.stderr.write = origStderrWrite;
      }
    });
  });

  describe('log level filtering', () => {
    it('should respect LOG_LEVEL environment variable', () => {
      const origLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'WARN';

      const stdoutLogs: string[] = [];
      const stderrLogs: string[] = [];
      const origStdoutWrite = process.stdout.write;
      const origStderrWrite = process.stderr.write;
      process.stdout.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') stdoutLogs.push(chunk);
        return true;
      };
      process.stderr.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') stderrLogs.push(chunk);
        return true;
      };

      try {
        const logger = createLogger('test-svc');
        logger.debug('should be filtered');
        logger.info('should be filtered');
        logger.warn('should appear');
        logger.error('should appear');

        const warnCount = stdoutLogs.filter((l) => {
          const e = JSON.parse(l);
          return e.level === 'WARN';
        }).length;

        const errorCount = stderrLogs.filter((l) => {
          const e = JSON.parse(l);
          return e.level === 'ERROR';
        }).length;

        expect(warnCount).toBe(1);
        expect(errorCount).toBe(1);
      } finally {
        process.stdout.write = origStdoutWrite;
        process.stderr.write = origStderrWrite;
        process.env.LOG_LEVEL = origLevel;
      }
    });
  });

  describe('context sanitization', () => {
    it('mirrors correlationId into requestId and redacts sensitive payload fields', () => {
      const logs: string[] = [];
      const origStdoutWrite = process.stdout.write;
      process.stdout.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') logs.push(chunk);
        return true;
      };

      try {
        const logger = createLogger('test-svc');
        logger.info('sanitized payload', {
          correlationId: 'corr-789',
          payload: 'email=user@example.com token: abc123 password: secret'
        });
        const entry = JSON.parse(logs[logs.length - 1]);
        expect(entry.correlationId).toBe('corr-789');
        expect(entry.requestId).toBe('corr-789');
        expect(entry.payload).toContain('[REDACTED]');
        expect(entry.payload).not.toContain('user@example.com');
        expect(entry.payload).not.toContain('abc123');
        expect(entry.payload).not.toContain('secret');
      } finally {
        process.stdout.write = origStdoutWrite;
      }
    });

    it('mirrors requestId into correlationId when only requestId is provided', () => {
      const logs: string[] = [];
      const origStdoutWrite = process.stdout.write;
      process.stdout.write = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') logs.push(chunk);
        return true;
      };

      try {
        const logger = createLogger('test-svc');
        logger.info('request id only', { requestId: 'req-123' });
        const entry = JSON.parse(logs[logs.length - 1]);
        expect(entry.requestId).toBe('req-123');
        expect(entry.correlationId).toBe('req-123');
      } finally {
        process.stdout.write = origStdoutWrite;
      }
    });
  });
});
