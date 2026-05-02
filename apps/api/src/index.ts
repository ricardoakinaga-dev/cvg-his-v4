import { createLogger } from '@cvg-his-v2/shared-logging';
import { createDatabaseClient, getDatabaseClient } from '@cvg-his-v2/shared-database';
import { createFeatureFlagMetricsCollector } from './metrics.js';

import { bootstrapServices, resolveProductionReadiness } from './bootstrap.js';
import { createApiServer } from './server.js';
import { createApiFeatureFlags, type ApiFeatureFlagsSnapshot } from './feature-flags.js';
import { setAppState, type PersistenceMode } from './app-state.js';
import { startApiObservability } from './observability.js';
import { resolveApiStartup } from './startup-secrets.js';

const version = '0.1.0';
let runtimeLogger = createLogger('cvg-his-v2-api-bootstrap');

process.on('uncaughtException', (error) => {
  runtimeLogger.error('uncaught exception in api runtime', {
    error: error instanceof Error ? error.message : String(error)
  });
});

process.on('unhandledRejection', (error) => {
  runtimeLogger.error('unhandled rejection in api runtime', {
    error: error instanceof Error ? error.message : String(error)
  });
});

async function main() {
  const startup = await resolveApiStartup(process.env);
  const config = startup.config;
  const secretsManager = startup.secretsManager;
  runtimeLogger = createLogger(config.appName);
  const logger = runtimeLogger;

  const observability = await startApiObservability({
    enabled: config.otelEnabled,
    serviceName: config.otelServiceName,
    environment: config.environment,
    serviceVersion: version,
    otlpProtocol: config.otlpProtocol,
    otlpTracesEndpoint: config.otlpTracesEndpoint,
    otlpHeaders: config.otlpHeaders
  });

  const shutdownObservability = () =>
    observability.shutdown().catch((error) => {
      logger.error('failed to shutdown api observability', {
        error: error instanceof Error ? error.message : String(error)
      });
    });

  process.once('SIGTERM', () => {
    void shutdownObservability().finally(() => process.exit(0));
  });
  process.once('SIGINT', () => {
    void shutdownObservability().finally(() => process.exit(0));
  });

  logger.info('starting api server bootstrap');
  logger.info('api observability state', {
    enabled: observability.enabled,
    exporter: observability.exporter,
    endpoint: observability.endpoint
  });

  logger.info('secrets manager initialized', {
    provider: secretsManager.provider,
    vaultEnabled: config.vaultEnabled,
    vaultNamespace: config.vaultNamespace,
    databaseUrlResolvedFromSecrets: !process.env.DATABASE_URL && Boolean(startup.env.DATABASE_URL)
  });

  const databaseUrl = config.databaseUrl;
  const databaseConfigured = Boolean(databaseUrl);
  if (databaseUrl) {
    createDatabaseClient(databaseUrl);
  }

  // GAP-06: Create API feature flags with database-backed provider + metrics
  const featureFlagMetrics = createFeatureFlagMetricsCollector();
  const db = databaseConfigured ? getDatabaseClient() : undefined;
  const featureFlags: ApiFeatureFlagsSnapshot = await createApiFeatureFlags({
    environment: config.environment,
    enabledKeys: config.apiFeatureFlags ?? [],
    db,
    metrics: featureFlagMetrics
  });

  logger.info('feature flags initialized', {
    provider: featureFlags.providerName,
    enabledKeys: featureFlags.enabledKeys.length
  });

  const bootstrapResult = await bootstrapServices({
    databaseUrl,
    fileStoragePath: config.fileStoragePath,
    skipDatabase: !databaseUrl
  });

  const repos = bootstrapResult.repositories;
  const repoCount = [
    repos.session,
    repos.audit,
    repos.owner,
    repos.patient,
    repos.ownerPatientLink,
    repos.encounter,
    repos.encounterTimeline,
    repos.medicalRecord,
    repos.clinicalEntry,
    repos.clinicalTimeline,
    repos.entryRevision,
    repos.attachment,
    repos.notification
  ].filter(Boolean).length;

  // Determine persistence mode
  let persistenceMode: PersistenceMode;
  if (bootstrapResult.repositoriesUseDatabase) {
    persistenceMode = 'database';
  } else if (databaseConfigured && !bootstrapResult.databaseHealthy) {
    persistenceMode = 'in-memory'; // DB configured but not healthy, falling back
  } else {
    persistenceMode = 'in-memory'; // No DB configured
  }

  const workerReady = persistenceMode === 'database' && Boolean(repos.notification);
  const readiness = resolveProductionReadiness({
    persistenceMode,
    workerReady,
    repositories: repos
  });
  const repositoryReadinessDetail = readiness.criticalRepositoriesReady
    ? 'criticalRepositories=ready'
    : `missingCriticalRepositories=${readiness.missingCriticalRepositories.join(',')}`;
  const ownerPatientLinkDetail = `ownerPatientLinkPersistence=${readiness.ownerPatientLinkPersistence}`;
  const workerDetail = workerReady
    ? `Worker can consume notification jobs via shared database repository; ${ownerPatientLinkDetail}; ${repositoryReadinessDetail}`
    : databaseConfigured && bootstrapResult.databaseHealthy && !bootstrapResult.repositoriesUseDatabase
      ? 'Database is healthy, but runtime repositories are intentionally kept in-memory until UUID/schema compatibility is completed'
      : databaseConfigured
      ? `Worker dependency degraded: notification repository not ready for shared DB processing; ${ownerPatientLinkDetail}; ${repositoryReadinessDetail}`
      : 'Worker dependency not configured because DATABASE_URL is absent';

  const productionReady = readiness.productionReady;

  setAppState({
    persistenceMode,
    databaseConfigured,
    databaseHealthy: bootstrapResult.databaseHealthy,
    databaseDetail: bootstrapResult.databaseDetail,
    repositoriesReady: readiness.criticalRepositoriesReady,
    repositoryCount: repoCount,
    workerReady,
    workerDetail,
    productionReady,
    initialized: true,
    secretsManagerProvider: secretsManager.provider,
    // GAP-09: ML services are always instantiated in createApiRuntime (no async init required)
    mlReady: true,
    mlDetail: 'SmartSchedulingService (F3-03), ModelRegistryService (F3-02), FeatureStoreService (F3-01) wired'
  });

  logger.info('persistence mode', {
    mode: persistenceMode,
    databaseConfigured,
    databaseHealthy: bootstrapResult.databaseHealthy,
    repositoriesReady: repoCount,
    criticalRepositoriesReady: readiness.criticalRepositoriesReady,
    missingCriticalRepositories: readiness.missingCriticalRepositories,
    ownerPatientLinkPersistence: readiness.ownerPatientLinkPersistence,
    workerReady,
    productionReady
  });

  const server = createApiServer({
    appName: config.appName,
    environment: config.environment,
    version,
    corsAllowedOrigins: config.corsAllowedOrigins,
    authSecret: config.authSecret,
    authVerifierSecrets: config.authVerifierSecrets,
    accessTokenTtlSeconds: config.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: config.refreshTokenTtlSeconds,
    authRateLimitMaxRequests: config.authRateLimitMaxRequests,
    authRateLimitWindowMs: config.authRateLimitWindowMs,
    enableMfa: config.enableMfa,
    mfaEncryptionKey: config.mfaEncryptionKey,
    repositories: bootstrapResult.repositories,
    fileStorage: bootstrapResult.fileStorage,
    sectorBedOptions: db ? { databaseClient: db } : undefined,
    featureFlagsProvider: config.featureFlagsProvider,
    runtimeDistributedStateEnabled: config.runtimeDistributedStateEnabled,
    // GAP-06: pre-resolved feature flags passed directly (already awaited above)
    featureFlags,
    pagarmeApiKey: config.pagarmeApiKey,
    pagarmePixKey: config.pagarmePixKey,
    pixMockMode: config.pixMockMode,
    resendApiKey: config.resendApiKey,
    emailFrom: config.emailFrom,
    emailMockMode: config.emailMockMode,
    smsApiKey: config.smsApiKey,
    smsFrom: config.smsFrom,
    smsMockMode: config.smsMockMode,
    googleCalendarAccessToken: config.googleCalendarAccessToken,
    googleCalendarCalendarId: config.googleCalendarCalendarId,
    googleCalendarMockMode: config.googleCalendarMockMode,
    redisUrl: config.redisUrl,
    secretsManager
  });

  await server.ready;

  server.listen(config.port, config.host, () => {
    logger.info('api server listening', {
      service: config.appName,
      host: config.host,
      port: config.port,
      environment: config.environment,
      persistenceMode,
      productionReady
    });
  });
}

main().catch((error) => {
  runtimeLogger.error('failed to start api server', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
