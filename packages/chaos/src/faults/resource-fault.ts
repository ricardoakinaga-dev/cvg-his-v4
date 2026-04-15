/**
 * Resource exhaustion fault injector.
 * Exhausts memory or connection pools to simulate resource pressure.
 */

export interface ResourceFaultOptions {
  /** Type of resource to exhaust */
  readonly type: 'memory' | 'connections';
  /** Number of resources to leak/consume */
  readonly leakCount?: number;
}

/** Tracks active leaks for cleanup */
const activeLeaks: Array<() => void> = [];

function allocateMemory(bytes: number): ArrayBuffer {
  return new ArrayBuffer(bytes);
}

/**
 * Injects a resource leak to simulate memory pressure.
 * Allocates buffers that are retained until cleanup is called.
 */
export function memoryLeakFault(options: ResourceFaultOptions): () => void {
  const { leakCount = 50, type = 'memory' } = options;
  const allocations: ArrayBuffer[] = [];

  if (type === 'memory') {
    for (let i = 0; i < leakCount; i++) {
      // Allocate ~10MB per leak (large enough to affect GC)
      allocations.push(allocateMemory(10 * 1024 * 1024));
    }
  }

  const cleanup = () => {
    allocations.length = 0;
    const idx = activeLeaks.indexOf(cleanup);
    if (idx !== -1) activeLeaks.splice(idx, 1);
  };

  activeLeaks.push(cleanup);
  return cleanup;
}

/**
 * Cleans up all active resource leaks.
 */
export function cleanupAllLeaks(): void {
  for (const leak of activeLeaks) {
    leak();
  }
  activeLeaks.length = 0;
}
