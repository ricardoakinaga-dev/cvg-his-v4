import { createServer } from 'node:http';
import { getWorkerHealthStatus } from './workerHealth.js';
function serializeHealthResponse(status) {
    return JSON.stringify(status, null, 2);
}
export function startHealthServer(config) {
    const { port, redis, cronConfigs, onHealthCheck } = config;
    const server = createServer(async (req, res) => {
        const url = req.url ?? '/';
        // CORS headers for health checks
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        // Health endpoint
        if (url === '/health' || url === '/healthz') {
            try {
                const status = await getWorkerHealthStatus(redis, cronConfigs);
                onHealthCheck?.(status);
                const statusCode = status.status === 'ok' ? 200 : status.status === 'degraded' ? 200 : 503;
                res.writeHead(statusCode, {
                    'Content-Type': 'application/json'
                });
                res.end(serializeHealthResponse(status));
                return;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                res.writeHead(503, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    status: 'unhealthy',
                    error: errorMessage,
                    checkedAt: new Date().toISOString()
                }));
                return;
            }
        }
        // Liveness probe - just check if process is running
        if (url === '/health/live' || url === '/livez') {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                status: 'alive',
                uptime: process.uptime()
            }));
            return;
        }
        // Readiness probe - check Redis connection
        if (url === '/health/ready' || url === '/readyz') {
            try {
                const pong = await redis.ping();
                if (pong === 'PONG') {
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({
                        status: 'ready',
                        redis: 'connected'
                    }));
                    return;
                }
                throw new Error('Redis ping failed');
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                res.writeHead(503, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    status: 'not_ready',
                    redis: 'disconnected',
                    error: errorMessage
                }));
                return;
            }
        }
        // 404 for unknown paths
        res.writeHead(404, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
            error: 'Not Found',
            path: url
        }));
    });
    server.listen(port, () => {
        // Server started
    });
    return {
        port,
        async stop() {
            return new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
    };
}
//# sourceMappingURL=healthServer.js.map