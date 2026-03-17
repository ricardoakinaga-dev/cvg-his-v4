import { auditRoutes } from '../modules/audit/routes.js';
import { patientsRoutes } from '../modules/patients/routes.js';
import { rbacRoutes } from '../modules/rbac/routes.js';
import { searchRoutes } from '../modules/search/routes.js';
import { ownersRoutes } from '../modules/owners/routes.js';
import { systemRoutes } from '../modules/system/routes.js';
import { healthRoutes } from './health.js';
export const apiRoutes = async (app) => {
    await app.register(healthRoutes);
    await app.register(systemRoutes);
    await app.register(auditRoutes);
    await app.register(rbacRoutes);
    await app.register(ownersRoutes, { prefix: '/owners' });
    await app.register(patientsRoutes, { prefix: '/patients' });
    await app.register(searchRoutes, { prefix: '/search' });
};
//# sourceMappingURL=index.js.map