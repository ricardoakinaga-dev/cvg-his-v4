import { buildServer } from './server.js';
import { runMigrations } from '../../../packages/db/src/migrate.js';

async function bootstrap(): Promise<void> {
  // 1) Migrations antes de subir API
  const runMigrationsOnBoot = process.env.RUN_MIGRATIONS_ON_BOOT === '1';
  if (runMigrationsOnBoot) {
    try {
      await runMigrations();
    } catch (error) {
      console.error('Fatal bootstrap error (migrations)', error);
      process.exit(1);
    }
  } else {
    console.info('Skipping migrations on API bootstrap. Use the migrate job/container instead.');
  }

  const app = await buildServer();
  const startupContext = {
    nodeEnv: app.env.NODE_ENV,
    port: app.env.PORT
  };

  app.log.info(startupContext, 'starting his-api');

  try {
    const address = await app.listen({
      host: '0.0.0.0',
      port: app.env.PORT
    });
    app.log.info({ ...startupContext, address }, 'his-api started');
  } catch (error) {
    app.log.error({ err: error, ...startupContext }, 'failed to start server');
    await app.close();
    process.exit(1);
  }
}

void bootstrap().catch((error) => {
  console.error('Fatal bootstrap error', error);
  process.exit(1);
});
