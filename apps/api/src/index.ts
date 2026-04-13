import { loadApiConfig } from '@cvg-his-v2/shared-config';
import { createLogger } from '@cvg-his-v2/shared-logging';

import { bootstrapServices } from './bootstrap.js';
import { createApiServer } from './server.js';
import { setAppState, type PersistenceMode } from './app-state.js';
import { startApiObservability } from './observability.js';

const config = loadApiConfig(process.env);
const logger = createLogger(config.appName);
const version = '0.1.0';

process.on('uncaughtException', (error) => {
  logger.error('uncaught exception in api runtime', {
    error: error instanceof Error ? error.message : String(error)
  });
});

process.on('unhandledRejection', (error) => {
  logger.error('unhandled rejection in api runtime', {
    error: error instanceof Error ? error.message : String(error)
  });
});

async function main() {
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

  const databaseUrl = config.databaseUrl;
  const databaseConfigured = Boolean(databaseUrl);
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
  const workerDetail = workerReady
    ? 'Worker can consume notification jobs via shared database repository'
    : databaseConfigured && bootstrapResult.databaseHealthy && !bootstrapResult.repositoriesUseDatabase
      ? 'Database is healthy, but runtime repositories are intentionally kept in-memory until UUID/schema compatibility is completed'
      : databaseConfigured
      ? 'Worker dependency degraded: notification repository not ready for shared DB processing'
      : 'Worker dependency not configured because DATABASE_URL is absent';

  // Production ready only when using real database and full repository wiring is available.
  const productionReady = persistenceMode === 'database' && repoCount >= 13 && workerReady;

  setAppState({
    persistenceMode,
    databaseConfigured,
    databaseHealthy: bootstrapResult.databaseHealthy,
    databaseDetail: bootstrapResult.databaseDetail,
    repositoriesReady: repoCount > 0,
    repositoryCount: repoCount,
    workerReady,
    workerDetail,
    productionReady,
    initialized: true
  });

  logger.info('persistence mode', {
    mode: persistenceMode,
    databaseConfigured,
    databaseHealthy: bootstrapResult.databaseHealthy,
    repositoriesReady: repoCount,
    workerReady,
    productionReady
  });

  const server = createApiServer({
    appName: config.appName,
    environment: config.environment,
    version,
    corsAllowedOrigins: config.corsAllowedOrigins,
    authSecret: config.authSecret,
    accessTokenTtlSeconds: config.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: config.refreshTokenTtlSeconds,
    authRateLimitMaxRequests: config.authRateLimitMaxRequests,
    authRateLimitWindowMs: config.authRateLimitWindowMs,
    enableMfa: config.enableMfa,
    mfaEncryptionKey: config.mfaEncryptionKey,
    repositories: bootstrapResult.repositories,
    fileStorage: bootstrapResult.fileStorage
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
  logger.error('failed to start api server', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
