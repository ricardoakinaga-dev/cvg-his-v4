import type { FastifyPluginAsync } from 'fastify';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { healthCache, reportCache, catalogCache } from '../../lib/cache.js';

/**
 * Metrics endpoint for monitoring.
 * Provides system metrics in JSON format.
 */

type MetricsData = {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  cache: {
    health: { size: number };
    reports: { size: number };
    catalog: { size: number };
  };
  timestamp: string;
};

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /metrics
   * System metrics for monitoring dashboards
   */
  app.get('/metrics', {
    preHandler: requirePermission('system.health.read'),
    schema: {
      tags: ['Health'],
      summary: 'System metrics',
      description: 'Returns system metrics including memory, CPU, and cache statistics'
    }
  }, async () => {
    const metrics: MetricsData = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      cache: {
        health: { size: healthCache.stats().size },
        reports: { size: reportCache.stats().size },
        catalog: { size: catalogCache.stats().size }
      },
      timestamp: new Date().toISOString()
    };

    return metrics;
  });

  /**
   * POST /metrics/cache/clear
   * Clear all caches (admin only)
   */
  app.post('/metrics/cache/clear', {
    preHandler: requirePermission('system.admin.test'),
    schema: {
      tags: ['Health'],
      summary: 'Clear all caches',
      description: 'Clear all in-memory caches (admin only)'
    }
  }, async () => {
    healthCache.clear();
    reportCache.clear();
    catalogCache.clear();

    return {
      message: 'All caches cleared',
      timestamp: new Date().toISOString()
    };
  });
};
