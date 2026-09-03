export const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;

export class DownloadTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `A exportação excedeu ${Math.ceil(timeoutMs / 1000)} segundos. Verifique os filtros e tente novamente.`
    );
    this.name = 'DownloadTimeoutError';
  }
}

export async function withDownloadTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs = DEFAULT_DOWNLOAD_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new DownloadTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export interface DownloadPayload {
  readonly filename: string;
  readonly contentType: string;
  readonly content: string;
  readonly contentEncoding?: 'utf8' | 'base64';
}

export function saveBrowserDownload(payload: DownloadPayload): void {
  const content =
    payload.contentEncoding === 'base64'
      ? Uint8Array.from(window.atob(payload.content), (character) => character.charCodeAt(0))
      : payload.content;
  const blob = new Blob([content], { type: payload.contentType });
  const objectUrl =
    typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : undefined;
  const anchor = document.createElement('a');
  anchor.href =
    objectUrl ?? `data:${payload.contentType},${encodeURIComponent(String(payload.content))}`;
  anchor.download = payload.filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
