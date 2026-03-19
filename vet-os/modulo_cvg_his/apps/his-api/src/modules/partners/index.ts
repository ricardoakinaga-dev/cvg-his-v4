import type { FastifyPluginAsync } from 'fastify';
import { partnersRoutes } from './routes.js';

export const partnersModule: FastifyPluginAsync = async (app) => {
  await app.register(partnersRoutes, { prefix: '/partners' });
};

export { partnersRoutes } from './routes.js';
