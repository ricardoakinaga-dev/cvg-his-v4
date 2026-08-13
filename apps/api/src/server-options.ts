import type { FileStorage } from '@cvg-his-v2/module-attachments';
import type { SectorBedServiceOptions } from '@cvg-his-v2/module-inpatient';
import type { SecretsManager } from '@cvg-his-v2/secrets';

import type { ApiFeatureFlagsSnapshot } from './feature-flags.js';
import type { RuntimeRepositories } from './runtime.js';

export interface ApiServerOptions {
  readonly appName: string;
  readonly environment: string;
  readonly version: string;
  readonly corsAllowedOrigins?: readonly string[];
  readonly authSecret: string;
  readonly authVerifierSecrets?: readonly string[];
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly authRateLimitMaxRequests?: number;
  readonly authRateLimitWindowMs?: number;
  readonly enableMfa?: boolean;
  readonly mfaEncryptionKey?: string;
  readonly repositories?: RuntimeRepositories;
  /** Runs each authenticated tenant request in one SET LOCAL transaction for database-enforced RLS. */
  readonly databaseRequestTransactions?: boolean;
  readonly fileStorage?: FileStorage;
  readonly sectorBedOptions?: SectorBedServiceOptions;
  readonly featureFlagsProvider?: string;
  /** Pre-resolved feature flags snapshot (GAP-06: avoids async call inside createApiServer). */
  readonly featureFlags?: ApiFeatureFlagsSnapshot;
  /** Gates distributed runtime state (Redis-backed session, encounter timeline, etc.). */
  readonly runtimeDistributedStateEnabled?: boolean;
  /** Keeps canonical owner/patient registry seeds available with repository-backed runtime. */
  readonly preserveSeedMasterDataWithRepository?: boolean;
  readonly pagarmeApiKey?: string;
  readonly pagarmePixKey?: string;
  /** When true, forces the local PIX gateway. Production-like environments reject this option. */
  readonly pixMockMode?: boolean;
  readonly resendApiKey?: string;
  readonly emailFrom?: string;
  readonly emailMockMode?: boolean;
  readonly smsApiKey?: string;
  readonly smsFrom?: string;
  readonly smsMockMode?: boolean;
  readonly googleCalendarAccessToken?: string;
  readonly googleCalendarCalendarId?: string;
  readonly googleCalendarMockMode?: boolean;
  /** Redis URL for distributed rate limiting. */
  readonly redisUrl?: string;
  /** Secrets manager for startup credentials; environment-backed when omitted. */
  readonly secretsManager?: SecretsManager;
  /** Explicit local/test opt-in for catalog stores when no database client exists. */
  readonly allowInMemoryCatalogFallback?: boolean;
}
