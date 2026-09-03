import { afterEach, describe, expect, it, vi } from 'vitest';

import { DownloadTimeoutError, saveBrowserDownload, withDownloadTimeout } from '../download';

describe('bounded browser download contract', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects a stalled export with an actionable bounded-time error', async () => {
    vi.useFakeTimers();
    const result = withDownloadTimeout(() => new Promise<never>(() => undefined), 2_000);
    const capturedResult = result.catch((reason: unknown) => reason);

    await vi.advanceTimersByTimeAsync(2_000);

    const error = await capturedResult;
    expect(error).toBeInstanceOf(DownloadTimeoutError);
    expect((error as Error).message).toContain('tente novamente');
  });

  it('saves UTF-8 content with the server filename and MIME type', () => {
    const createObjectURL = vi.fn(() => 'blob:bounded-download');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    saveBrowserDownload({
      filename: 'agenda-2026-09-02.csv',
      contentType: 'text/csv;charset=utf-8',
      content: 'nome;data\nRex;2026-09-02'
    });

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});
