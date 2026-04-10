import { loadApiConfig } from '@cvg-his-v2/shared-config';
import { createLogger } from '@cvg-his-v2/shared-logging';

import { bootstrapServices, getDatabaseUrl, isDatabaseConfigured } from './bootstrap.js';
import { createApiServer } from './server.js';
import { setAppState, type PersistenceMode } from './app-state.js';

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
  logger.info('starting api server bootstrap');

  const databaseUrl = getDatabaseUrl();
  const databaseConfigured = isDatabaseConfigured();
  const bootstrapResult = await bootstrapServices({
    databaseUrl,
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
  if (bootstrapResult.databaseHealthy) {
    persistenceMode = 'database';
  } else if (databaseConfigured && !bootstrapResult.databaseHealthy) {
    persistenceMode = 'in-memory'; // DB configured but not healthy, falling back
  } else {
    persistenceMode = 'in-memory'; // No DB configured
  }

  const workerReady = persistenceMode === 'database' && Boolean(repos.notification);
  const workerDetail = workerReady
    ? 'Worker can consume notification jobs via shared database repository'
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
    authSecret: config.authSecret,
    accessTokenTtlSeconds: config.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: config.refreshTokenTtlSeconds,
    repositories: bootstrapResult.repositories,
    fileStorage: bootstrapResult.fileStorage
  });

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
