import type { IncomingMessage } from 'node:http';

const rawBodyCache = new WeakMap<IncomingMessage, Promise<Buffer>>();

export class RawRequestBodyTooLargeError extends Error {
  readonly code = 'RAW_BODY_TOO_LARGE' as const;

  constructor(readonly maxBodyBytes: number) {
    super(`Request body exceeds the ${maxBodyBytes}-byte limit`);
    this.name = 'RawRequestBodyTooLargeError';
  }
}

export class RawRequestBodyAbortedError extends Error {
  readonly code = 'RAW_BODY_ABORTED' as const;

  constructor() {
    super('Request body stream was aborted');
    this.name = 'RawRequestBodyAbortedError';
  }
}

export class RawRequestBodyStreamError extends Error {
  readonly code = 'RAW_BODY_STREAM_ERROR' as const;

  constructor(cause: unknown) {
    super('Request body stream failed', { cause });
    this.name = 'RawRequestBodyStreamError';
  }
}

function declaredContentLength(request: IncomingMessage): number | null {
  const value = request.headers?.['content-length'];
  if (value === undefined || Array.isArray(value)) return null;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function readFromStream(request: IncomingMessage, maxBodyBytes: number): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let sizeBytes = 0;
    let settled = false;

    const cleanup = (): void => {
      request.removeListener('data', onData);
      request.removeListener('end', onEnd);
      request.removeListener('aborted', onAborted);
      request.removeListener('error', onError);
    };

    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onData = (chunk: unknown): void => {
      if (settled) return;
      let buffer: Buffer;
      try {
        buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array | string);
      } catch (error) {
        fail(new RawRequestBodyStreamError(error));
        return;
      }
      sizeBytes += buffer.length;
      if (sizeBytes > maxBodyBytes) {
        fail(new RawRequestBodyTooLargeError(maxBodyBytes));
        return;
      }
      chunks.push(buffer);
    };

    const onEnd = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks, sizeBytes));
    };

    const onAborted = (): void => fail(new RawRequestBodyAbortedError());
    const onError = (error: Error): void => fail(new RawRequestBodyStreamError(error));

    request.on('data', onData);
    request.once('end', onEnd);
    request.once('aborted', onAborted);
    request.once('error', onError);

    // IncomingMessage is a readable stream. Calling resume also supports a
    // request whose producer has not yet started flowing, while the event
    // listeners preserve the original bytes without decoding them.
    request.resume?.();
  });
}

/**
 * Read an HTTP body as the exact bytes received on the wire.
 *
 * The promise is cached per request because signature verification and the
 * route parser must observe the same bytes; no JSON parse or reserialization
 * happens in this layer.
 */
export function readRawRequestBody(
  request: IncomingMessage,
  maxBodyBytes = 65_536
): Promise<Buffer> {
  const cached = rawBodyCache.get(request);
  if (cached) return cached;

  const declaredLength = declaredContentLength(request);
  if (declaredLength !== null && declaredLength > maxBodyBytes) {
    const rejected = Promise.reject(new RawRequestBodyTooLargeError(maxBodyBytes));
    rawBodyCache.set(request, rejected);
    return rejected;
  }

  const body = readFromStream(request, maxBodyBytes);
  rawBodyCache.set(request, body);
  return body;
}
