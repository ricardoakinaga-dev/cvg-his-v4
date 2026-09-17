import { isProductionLikeEnvironment } from '@cvg-his-v2/shared-config';

import { resolveRedisHealthStatus } from './routes/health-routes.js';
import type { ApiRateLimiter } from './server.js';

export interface DistributedStateReadinessOptions {
  readonly environment: string;
  readonly runtimeDistributedStateEnabled: boolean;
  readonly redisUrl?: string;
  readonly authRateLimiter?: ApiRateLimiter;
  readonly pixPaymentAttemptRateLimiter?: ApiRateLimiter;
  readonly pixProviderWebhookRateLimiter?: ApiRateLimiter;
}

/**
 * Prove distributed state before a production-like listener accepts traffic.
 * The readiness endpoint continues probing the same dependency thereafter.
 */
export async function assertDistributedStateReadiness(
  options: DistributedStateReadinessOptions
): Promise<void> {
  if (!isProductionLikeEnvironment(options.environment)) return;

  if (!options.runtimeDistributedStateEnabled || !options.redisUrl) {
    throw new Error(
      'Production-like API requires an enabled and configured Redis distributed-state backend'
    );
  }

  const health = await resolveRedisHealthStatus(options, true);
  if (!health?.healthy) {
    throw new Error('Production-like API cannot start while Redis distributed state is unhealthy');
  }
}
