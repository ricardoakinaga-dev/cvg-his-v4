import type { ServerResponse } from 'node:http';
import type { AuditService } from '@cvg-his-v2/module-audit';

type ResponseEnd = ServerResponse['end'];

/**
 * Buffers ServerResponse.end while a request-scoped database transaction is
 * active. The client only receives the successful response after COMMIT;
 * rollback discards it so the error handler can send the real failure.
 */
export async function deferResponseEndUntilCommitted<T>(
  response: ServerResponse,
  operation: () => Promise<T>
): Promise<T> {
  const originalEnd = response.end;
  let deferredArguments: unknown[] | undefined;

  response.end = ((...arguments_: unknown[]) => {
    if (deferredArguments) {
      throw new Error('HTTP response ended more than once inside a database transaction');
    }
    deferredArguments = [...arguments_];
    return response;
  }) as ResponseEnd;

  try {
    const result = await operation();
    response.end = originalEnd;

    if (deferredArguments) {
      (originalEnd as (...arguments_: unknown[]) => ServerResponse).apply(
        response,
        deferredArguments
      );
    }

    return result;
  } catch (error) {
    response.end = originalEnd;
    throw error;
  }
}

export async function executeWithAuditFlush<T>(
  audit: AuditService,
  correlationId: string,
  operation: () => Promise<T>
): Promise<T> {
  try {
    const result = await operation();
    await audit.flushPendingWrites(correlationId);
    return result;
  } catch (requestError) {
    try {
      await audit.flushPendingWrites(correlationId);
    } catch (auditError) {
      throw new AggregateError(
        [requestError, auditError],
        'Request handling and audit persistence both failed'
      );
    }
    throw requestError;
  }
}
