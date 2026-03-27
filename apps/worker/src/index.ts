import { loadWorkerConfig } from "@cvg-his-v2/shared-config";
import { createLogger } from "@cvg-his-v2/shared-logging";
import { createCorrelationId, sleep } from "@cvg-his-v2/shared-utils";

import { bootstrapWorkerServices, shutdownWorkerServices } from "./bootstrap.js";
import { createWorkerNotifications } from "./runner.js";
import { runWorkerTick } from "./runner.js";

const config = loadWorkerConfig(process.env);
const logger = createLogger(config.appName);

logger.info("worker bootstrap complete", {
  service: config.appName,
  environment: config.environment,
  intervalMs: config.intervalMs,
});

async function main() {
  const bootstrap = await bootstrapWorkerServices({
    databaseUrl: process.env.DATABASE_URL,
  });
  logger.info("worker dependency state", {
    service: config.appName,
    databaseHealthy: bootstrap.databaseHealthy,
    databaseDetail: bootstrap.databaseDetail,
    persistenceMode: bootstrap.notificationRepository ? "database" : "in-memory",
  });
  const notifications = createWorkerNotifications({
    notificationRepository: bootstrap.notificationRepository,
  });

  while (true) {
    const correlationId = createCorrelationId("worker");
    await runWorkerTick(
      logger,
      {
        service: config.appName,
        environment: config.environment,
        correlationId,
        persistenceMode: bootstrap.notificationRepository ? "database" : "in-memory",
        databaseHealthy: bootstrap.databaseHealthy,
        databaseDetail: bootstrap.databaseDetail,
      },
      notifications,
    );
    await sleep(config.intervalMs);
  }
}

main().catch((error) => {
  logger.error("worker crashed", { service: config.appName, error: error.message, stack: error.stack });
  process.exitCode = 1;
}).finally(async () => {
  await shutdownWorkerServices();
});
