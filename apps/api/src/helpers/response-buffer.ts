import type { OutgoingHttpHeaders, ServerResponse } from 'node:http';

export interface BufferedResponseSnapshot {
  readonly statusCode: number;
  readonly statusMessage?: string;
  readonly headers: Readonly<Record<string, string | number | readonly string[]>>;
  readonly bodyBase64: string;
}

export interface BufferedResponse {
  readonly response: ServerResponse;
  snapshot(): BufferedResponseSnapshot;
}

type HeaderValue = string | number | readonly string[];

function normalizeHeaderName(name: string): string {
  return name.toLowerCase();
}

function copyHeaders(source: NodeJS.Dict<HeaderValue>): Record<string, HeaderValue> {
  return Object.fromEntries(
    Object.entries(source).map(([name, value]) => [name.toLowerCase(), value as HeaderValue])
  );
}

/**
 * Captures a mutation response until the surrounding tenant transaction has
 * committed. This also gives idempotent replays a deterministic HTTP envelope
 * instead of returning after the route has already been skipped.
 */
export function createBufferedResponse(target: ServerResponse): BufferedResponse {
  let statusCode = target.statusCode;
  let statusMessage: string | undefined = target.statusMessage;
  let ended = false;
  let body = Buffer.alloc(0);
  const initialHeaders =
    typeof target.getHeaders === 'function'
      ? target.getHeaders()
      : ({} as NodeJS.Dict<HeaderValue>);
  const headers = copyHeaders(initialHeaders as NodeJS.Dict<HeaderValue>);

  const appendBody = (chunk?: unknown, encoding?: BufferEncoding): void => {
    if (chunk === undefined || chunk === null) return;
    const next = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(String(chunk), encoding);
    body = Buffer.concat([body, next]);
  };

  const proxy = new Proxy(target, {
    get(current, property, receiver) {
      switch (property) {
        case 'statusCode':
          return statusCode;
        case 'statusMessage':
          return statusMessage;
        case 'headersSent':
          return ended;
        case 'writableEnded':
          return ended;
        case 'setHeader':
          return (name: string, value: HeaderValue) => {
            headers[normalizeHeaderName(name)] = value;
            return proxy;
          };
        case 'getHeader':
          return (name: string) => headers[normalizeHeaderName(name)];
        case 'getHeaders':
          return () => ({ ...headers });
        case 'getHeaderNames':
          return () => Object.keys(headers);
        case 'hasHeader':
          return (name: string) => Object.hasOwn(headers, normalizeHeaderName(name));
        case 'removeHeader':
          return (name: string) => {
            delete headers[normalizeHeaderName(name)];
          };
        case 'writeHead':
          return (
            code: number,
            messageOrHeaders?: string | OutgoingHttpHeaders,
            maybeHeaders?: OutgoingHttpHeaders
          ) => {
            statusCode = code;
            if (typeof messageOrHeaders === 'string') {
              statusMessage = messageOrHeaders;
              if (maybeHeaders) Object.assign(headers, copyHeaders(maybeHeaders));
            } else if (messageOrHeaders) {
              Object.assign(headers, copyHeaders(messageOrHeaders));
            }
            return proxy;
          };
        case 'write':
          return (chunk: unknown, encoding?: BufferEncoding) => {
            appendBody(chunk, encoding);
            return true;
          };
        case 'end':
          return (chunk?: unknown, encoding?: BufferEncoding | (() => void), callback?: () => void) => {
            if (typeof encoding === 'function') {
              appendBody(chunk);
              encoding();
            } else {
              appendBody(chunk, encoding);
              callback?.();
            }
            ended = true;
            return proxy;
          };
        case 'flushHeaders':
          return () => undefined;
        default:
          return Reflect.get(current, property, receiver);
      }
    },
    set(current, property, value, receiver) {
      if (property === 'statusCode') {
        statusCode = Number(value);
        return true;
      }
      if (property === 'statusMessage') {
        statusMessage = typeof value === 'string' ? value : undefined;
        return true;
      }
      return Reflect.set(current, property, value, receiver);
    }
  });

  return {
    response: proxy,
    snapshot: () => ({
      statusCode,
      statusMessage,
      headers: { ...headers },
      bodyBase64: body.toString('base64')
    })
  };
}

export function applyBufferedResponse(
  target: ServerResponse,
  snapshot: BufferedResponseSnapshot
): void {
  for (const [name, value] of Object.entries(snapshot.headers)) {
    target.setHeader(name, value as string | number | readonly string[]);
  }
  target.statusCode = snapshot.statusCode;
  if (snapshot.statusMessage) target.statusMessage = snapshot.statusMessage;
  target.end(Buffer.from(snapshot.bodyBase64, 'base64'));
}
