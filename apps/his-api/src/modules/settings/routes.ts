import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createSettingsService, ALLOWED_NAMESPACES, type SettingNamespace } from './service.js';

// Validation schemas
const namespaceParamSchema = z.object({
  namespace: z.enum(ALLOWED_NAMESPACES)
});

const keyParamSchema = z.object({
  namespace: z.enum(ALLOWED_NAMESPACES),
  key: z.string().regex(/^[a-z0-9_.-]{1,64}$/, 'Key must be 1-64 lowercase alphanumeric chars, dots, dashes, or underscores')
});

// Max 20KB for value_json
const MAX_VALUE_SIZE = 20 * 1024;

const valueJsonSchema = z.any().refine(
  (val) => {
    try {
      const size = JSON.stringify(val).length;
      return size <= MAX_VALUE_SIZE;
    } catch {
      return false;
    }
  },
  { message: 'value_json must be serializable and under 20KB' }
);

const upsertBodySchema = z.object({
  value_json: valueJsonSchema
});

// Permission mapping for namespaces
const namespacePermissions: Record<SettingNamespace, { read: string; update: string }> = {
  geral: { read: 'settings.geral.read', update: 'settings.geral.update' },
  clinica: { read: 'settings.clinica.read', update: 'settings.clinica.update' },
  internacao: { read: 'settings.internacao.read', update: 'settings.internacao.update' },
  imagem: { read: 'settings.imagem.read', update: 'settings.imagem.update' },
  laboratorio: { read: 'settings.laboratorio.read', update: 'settings.laboratorio.update' },
  estoque: { read: 'settings.estoque.read', update: 'settings.estoque.update' },
  financeiro: { read: 'settings.financeiro.read', update: 'settings.financeiro.update' }
};

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  // GET /settings/:namespace - List all settings for a namespace
  app.get(
    '/:namespace',
    async (request, reply) => {
      const params = namespaceParamSchema.parse(request.params);
      const permissions = namespacePermissions[params.namespace];
      
      // Check permission dynamically using preHandler pattern
      await requirePermission(permissions.read)(request, reply);
      
      const service = createSettingsService({ db: app.db, requestContext: request.requestContext });
      return service.listByNamespace(params.namespace);
    }
  );

  // PUT /settings/:namespace/:key - Upsert a setting
  app.put(
    '/:namespace/:key',
    async (request, reply) => {
      const params = keyParamSchema.parse(request.params);
      const body = upsertBodySchema.parse(request.body);
      const permissions = namespacePermissions[params.namespace];
      
      // Check permission dynamically using preHandler pattern
      await requirePermission(permissions.update)(request, reply);
      
      const service = createSettingsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.upsert(params.namespace, params.key, body.value_json);
      
      return reply.status(200).send(result);
    }
  );
};
