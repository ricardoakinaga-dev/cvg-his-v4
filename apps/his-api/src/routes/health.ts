import { readFileSync } from 'node:fs';

import type { FastifyPluginAsync } from 'fastify';

type PackageMetadata = {
  version: string;
};

const packageMetadata = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as PackageMetadata;

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    const [db, redis] = await Promise.all([app.checkDbHealth(), app.checkRedisHealth()]);

    return {
      status: 'ok',
      version: packageMetadata.version,
      uptime: process.uptime(),
      db,
      redis
    };
  });

  app.get('/health/db', async (_request, reply) => {
    const db = await app.checkDbHealth();
    const statusCode = db === 'ok' ? 200 : 503;

    return reply.status(statusCode).send({ db });
  });

  app.get('/health/redis', async (_request, reply) => {
    const redis = await app.checkRedisHealth();
    const statusCode = redis === 'ok' ? 200 : 503;

    return reply.status(statusCode).send({ redis });
  });
};
