/**
 * Build Routes - Exposes build information for traceability
 */
export const buildRoutes = async (app) => {
    app.get('/build', async (_request, reply) => {
        const buildInfo = {
            buildId: process.env.BUILD_ID || process.env.GIT_SHA || 'dev',
            gitSha: process.env.GIT_SHA || 'unknown',
            buildTime: process.env.BUILD_TIME || 'unknown',
        };
        return reply.status(200).send(buildInfo);
    });
};
//# sourceMappingURL=routes.js.map