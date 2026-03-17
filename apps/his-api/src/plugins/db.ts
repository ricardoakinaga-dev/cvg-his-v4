import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    void promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

async function loadDbModule() {
  return import('@cvg-his/db');
}

type DbModule = Awaited<ReturnType<typeof loadDbModule>>;

declare module 'fastify' {
  interface FastifyInstance {
    db: DbModule['db'];
    checkDbHealth: () => Promise<'ok' | 'fail'>;
  }

  interface FastifyRequest {
    db: DbModule['db'];
  }
}

const dbPluginImpl: FastifyPluginAsync = async (app) => {
  const { db: drizzleDb, closeDbConnection } = await loadDbModule();

  app.decorate('db', drizzleDb);
  app.decorateRequest('db', {
    getter() {
      return drizzleDb;
    }
  });

  app.decorate('checkDbHealth', async () => {
    try {
      await withTimeout(drizzleDb.$client.query('select 1'), 1000);
      return 'ok';
    } catch (error) {
      app.log.warn({ err: error }, 'db health check failed');
      return 'fail';
    }
  });

  app.addHook('onClose', async () => {
    await closeDbConnection();
  });
};

export const dbPlugin = fp(dbPluginImpl, {
  name: 'db-plugin'
});
