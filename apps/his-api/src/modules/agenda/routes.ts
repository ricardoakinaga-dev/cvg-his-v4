import type { FastifyPluginAsync } from 'fastify';

import { collaboratorsRoutes } from './collaborators.routes.js';
import { resourcesRoutes } from './resources.routes.js';
import { appointmentTypesRoutes } from './appointmentTypes.routes.js';
import { appointmentsRoutes } from './appointments.routes.js';
import { availabilityRoutes } from './availability.routes.js';

export const agendaRoutes: FastifyPluginAsync = async (app) => {
    await app.register(collaboratorsRoutes, { prefix: '/collaborators' });
    await app.register(resourcesRoutes, { prefix: '/resources' });
    await app.register(appointmentTypesRoutes, { prefix: '/appointment-types' });
    await app.register(availabilityRoutes, { prefix: '/availability' });
    await app.register(appointmentsRoutes, { prefix: '/appointments' });
};
