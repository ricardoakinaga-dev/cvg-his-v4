import { createLogger } from '@cvg-his-v2/shared-logging';
import { isProductionLikeEnvironment } from '@cvg-his-v2/shared-config';
import {
  createDatabaseClient,
  getDatabaseClient,
  withTenantTransaction
} from '@cvg-his-v2/shared-database';
import { createFeatureFlagMetricsCollector } from './metrics.js';

import { bootstrapServices, resolveProductionReadiness, shutdownServices } from './bootstrap.js';
import { createApiServer, type ApiServer } from './server.js';
import { createApiFeatureFlags, type ApiFeatureFlagsSnapshot } from './feature-flags.js';
import { setAppState, type PersistenceMode } from './app-state.js';
import { startApiObservability } from './observability.js';
import { resolveApiStartup } from './startup-secrets.js';
import { resolveSetupBootstrapToken } from './setup-token.js';
import { DatabaseVetusImportLogRepository } from './repositories/vetus-import-log-repository.js';
import { DatabasePixProviderEventIngressRepository } from './pix-provider-event-ingress-repository.js';
import { parsePixProviderWebhookKeyring } from './pix-provider-webhook-keyring.js';
import { parseLaboratoryProviderKeyring } from './laboratory-provider-keyring.js';
import {
  ClamAvAttachmentSecurityScanner,
  LocalAttachmentSecurityScanner,
  S3CompatibleFileStorage
} from '@cvg-his-v2/module-attachments';
import type { NfseIssuer, NfseProvider } from '@cvg-his-v2/module-fiscal';

const version = '0.1.0';
let runtimeLogger = createLogger('cvg-his-v2-api-bootstrap');
let apiServer: ApiServer | undefined;
let apiShutdownRequested = false;
let apiShutdownPromise: Promise<void> | undefined;
let apiShutdownLogger = runtimeLogger;
let apiShutdownObservability: () => Promise<void> = async () => {};
let apiObservabilityShutdownStarted = false;
let apiStartupFailed = false;

const NFSE_PROVIDERS: readonly NfseProvider[] = ['abrasf', 'iss_sp', 'iss_net', 'nota_rio'];

async function closeApiServer(): Promise<void> {
  const server = apiServer;
  if (!server) return;

  if (server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await server.closeDependencies();
}

async function gracefulShutdown(signal: NodeJS.Signals): Promise<void> {
  apiShutdownRequested = true;
  apiShutdownPromise ??= (async () => {
    const failures: unknown[] = [];
    const attempt = async (operation: () => Promise<void>): Promise<void> => {
      try {
        await operation();
      } catch (error: unknown) {
        failures.push(error);
        apiShutdownLogger.error('api shutdown operation failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };

    apiShutdownLogger.info('draining api server', { signal });
    await attempt(closeApiServer);
    await attempt(shutdownServices);
    await attempt(apiShutdownObservability);
    if (failures.length > 0) {
      throw failures[0];
    }
    apiShutdownLogger.info('api server shutdown complete', { signal });
  })();
  await apiShutdownPromise;
}

function requestShutdown(signal: NodeJS.Signals): void {
  void gracefulShutdown(signal).then(
    () => {
      if (!apiStartupFailed) process.exitCode = 0;
    },
    (error: unknown) => {
      apiShutdownLogger.error('api graceful shutdown failed', {
        signal,
        error: error instanceof Error ? error.message : String(error)
      });
      process.exitCode = 1;
    }
  );
}

async function stopStartupIfRequested(): Promise<boolean> {
  if (!apiShutdownRequested) return false;
  await apiShutdownPromise;
  return true;
}

process.on('SIGTERM', () => requestShutdown('SIGTERM'));
process.on('SIGINT', () => requestShutdown('SIGINT'));

function parseNfseProvider(value: string | undefined): NfseProvider | undefined {
  if (!value) return undefined;
  if (!NFSE_PROVIDERS.includes(value as NfseProvider)) {
    throw new Error(`NFSE_PROVIDER must be one of: ${NFSE_PROVIDERS.join(', ')}`);
  }
  return value as NfseProvider;
}

function parseNfseIssuer(value: string | undefined): NfseIssuer | undefined {
  if (!value) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('NFSE_ISSUER_JSON must contain valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('NFSE_ISSUER_JSON must contain an object');
  }
  const issuer = parsed as Partial<NfseIssuer>;
  if (
    !issuer.cnpj ||
    !issuer.inscricaoMunicipal ||
    !issuer.razaoSocial ||
    !issuer.address ||
    typeof issuer.address !== 'object'
  ) {
    throw new Error(
      'NFSE_ISSUER_JSON must include cnpj, inscricaoMunicipal, razaoSocial and address'
    );
  }
  return issuer as NfseIssuer;
}

function parseNfseCertificate(value: string | undefined): Buffer | undefined {
  if (!value) return undefined;
  const certificate = Buffer.from(value, 'base64');
  if (certificate.length === 0) throw new Error('NFSE_CERTIFICATE_BASE64 must not be empty');
  return certificate;
}

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
  if (await stopStartupIfRequested()) return;
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

  apiShutdownLogger = logger;
  apiShutdownObservability = async () => {
    if (apiObservabilityShutdownStarted) return;
    apiObservabilityShutdownStarted = true;
    try {
      await observability.shutdown();
    } catch (error: unknown) {
      logger.error('failed to shutdown api observability', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };
  if (apiShutdownRequested && !apiObservabilityShutdownStarted) {
    await apiShutdownObservability();
  }
  if (await stopStartupIfRequested()) return;

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
  if (await stopStartupIfRequested()) return;

  logger.info('feature flags initialized', {
    provider: featureFlags.providerName,
    enabledKeys: featureFlags.enabledKeys.length
  });

  const bootstrapResult = await bootstrapServices({
    databaseUrl,
    environment: config.environment,
    fileStoragePath: config.fileStoragePath,
    skipDatabase: !databaseUrl
  });
  if (await stopStartupIfRequested()) return;

  const productionLike = isProductionLikeEnvironment(config.environment);
  const attachmentScanner = productionLike
    ? config.attachmentScannerHost
      ? new ClamAvAttachmentSecurityScanner({
          host: config.attachmentScannerHost,
          port: config.attachmentScannerPort,
          timeoutMs: config.attachmentScannerTimeoutMs
        })
      : undefined
    : new LocalAttachmentSecurityScanner();
  const fileStorage =
    productionLike &&
    config.attachmentStorageS3Endpoint &&
    config.attachmentStorageS3Bucket &&
    config.attachmentStorageS3AccessKey &&
    config.attachmentStorageS3SecretKey
      ? new S3CompatibleFileStorage({
          endpoint: config.attachmentStorageS3Endpoint,
          bucket: config.attachmentStorageS3Bucket,
          accessKeyId: config.attachmentStorageS3AccessKey,
          secretAccessKey: config.attachmentStorageS3SecretKey,
          region: config.attachmentStorageS3Region,
          pathStyle: config.attachmentStorageS3PathStyle
        })
      : bootstrapResult.fileStorage;

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
    : databaseConfigured &&
        bootstrapResult.databaseHealthy &&
        !bootstrapResult.repositoriesUseDatabase
      ? 'Database is healthy, but runtime repositories were explicitly disabled by API_DISABLE_INCOMPATIBLE_DB_REPOS'
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
    mlDetail:
      'SmartSchedulingService (F3-03), ModelRegistryService (F3-02), FeatureStoreService (F3-01) wired'
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

  // Setup mutation remains disabled until an operator deliberately supplies a
  // bootstrap secret. The secret is never generated or written to logs.
  const setupToken = resolveSetupBootstrapToken(config.setupBootstrapToken);
  const pixProviderWebhookKeyring = config.pixSyntheticWebhookEnabled
    ? parsePixProviderWebhookKeyring(config.pixProviderWebhookKeyringJson)
    : new Map();
  const laboratoryProviderKeyring = parseLaboratoryProviderKeyring(
    config.laboratoryProviderKeyringJson
  );
  const pixProviderEventIngressRepository =
    config.pixSyntheticWebhookEnabled && databaseConfigured
      ? new DatabasePixProviderEventIngressRepository()
      : undefined;

  apiServer = createApiServer({
    appName: config.appName,
    environment: config.environment,
    version,
    setupBootstrapToken: setupToken.token,
    corsAllowedOrigins: config.corsAllowedOrigins,
    authSecret: config.authSecret,
    authVerifierSecrets: config.authVerifierSecrets,
    accessTokenTtlSeconds: config.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: config.refreshTokenTtlSeconds,
    authRateLimitMaxRequests: config.authRateLimitMaxRequests,
    authRateLimitWindowMs: config.authRateLimitWindowMs,
    trustedProxyCidrs: config.trustedProxyCidrs,
    enableMfa: config.enableMfa,
    mfaEncryptionKey: config.mfaEncryptionKey,
    mfaEncryptionKeyVersion: config.mfaEncryptionKeyVersion,
    mfaEncryptionKeyring: config.mfaEncryptionKeyring,
    repositories: bootstrapResult.repositories,
    fileStorage,
    attachmentScanner,
    // A healthy database is not enough to opt individual aggregates into
    // persistence: the bootstrap contract must have initialized all required
    // repositories before the canonical runtime is selected.
    sectorBedOptions: persistenceMode === 'database' && db ? { databaseClient: db } : undefined,
    unitOfWork: bootstrapResult.unitOfWork,
    tenantTransaction: bootstrapResult.repositoriesUseDatabase
      ? async <T>(
          accountId: string,
          command: () => Promise<T>,
          metadata?: { readonly actorUserId: string; readonly correlationId: string }
        ): Promise<T> => withTenantTransaction(accountId, async () => command(), metadata)
      : undefined,
    medicalRecordsPersistenceMode: bootstrapResult.repositoriesUseDatabase
      ? 'repositories'
      : 'memory',
    featureFlagsProvider: config.featureFlagsProvider,
    runtimeDistributedStateEnabled: config.runtimeDistributedStateEnabled,
    preserveSeedUsersWithRepository: persistenceMode !== 'database',
    preserveSeedMasterDataWithRepository: persistenceMode !== 'database',
    requireUuidEntityIdentifiers: persistenceMode === 'database',
    useDatabaseCatalogStores: persistenceMode === 'database',
    vetusImportLogRepository:
      persistenceMode === 'database' ? new DatabaseVetusImportLogRepository() : undefined,
    // GAP-06: pre-resolved feature flags passed directly (already awaited above)
    featureFlags,
    pagarmeApiKey: config.pagarmeApiKey,
    pagarmePixKey: config.pagarmePixKey,
    pixMockMode: config.pixMockMode,
    pixProviderWebhookSyntheticEnabled: config.pixSyntheticWebhookEnabled,
    pixProviderWebhookKeyring,
    laboratoryProviderKeyring,
    pixProviderEventIngressRepository,
    pixProviderSettlementDlqRepository: bootstrapResult.pixProviderSettlementDlqRepository,
    nfseProvider: parseNfseProvider(config.nfseProvider),
    nfseApiUrl: config.nfseApiUrl,
    nfseApiKey: config.nfseApiKey,
    nfseMunicipalityCode: config.nfseMunicipalityCode,
    nfseCertificate: parseNfseCertificate(config.nfseCertificateBase64),
    nfseIssuer: parseNfseIssuer(config.nfseIssuerJson),
    nfseRegime:
      config.nfseRegime === 'simples_nacional' ||
      config.nfseRegime === 'lucro_presumido' ||
      config.nfseRegime === 'lucro_real'
        ? config.nfseRegime
        : undefined,
    resendApiKey: config.resendApiKey,
    emailFrom: config.emailFrom,
    emailMockMode: config.emailMockMode,
    smsApiKey: config.smsApiKey,
    smsFrom: config.smsFrom,
    smsMockMode: config.smsMockMode,
    googleCalendarAccessToken: config.googleCalendarAccessToken,
    googleCalendarCalendarId: config.googleCalendarCalendarId,
    googleCalendarMockMode: config.googleCalendarMockMode,
    whatsappWebhookSecret: process.env['WHATSAPP_WEBHOOK_SECRET'],
    redisUrl: config.redisUrl,
    secretsManager
  });

  if (await stopStartupIfRequested()) return;

  await apiServer.ready;

  if (await stopStartupIfRequested()) return;

  apiServer.listen(config.port, config.host, () => {
    if (apiShutdownRequested) {
      void closeApiServer().catch((error: unknown) => {
        apiShutdownLogger.error('api listener close after late signal failed', {
          error: error instanceof Error ? error.message : String(error)
        });
        process.exitCode = 1;
      });
      return;
    }
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

void main().catch(async (error) => {
  apiStartupFailed = true;
  runtimeLogger.error('failed to start api server', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
  await gracefulShutdown('SIGTERM').catch((shutdownError: unknown) => {
    runtimeLogger.error('api startup cleanup failed', {
      error: shutdownError instanceof Error ? shutdownError.message : String(shutdownError)
    });
    process.exitCode = 1;
  });
});
