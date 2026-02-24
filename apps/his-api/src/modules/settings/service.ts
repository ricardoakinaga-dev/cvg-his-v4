import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createSettingsRepo, type SettingRecord } from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

// Allowed namespaces for settings
export const ALLOWED_NAMESPACES = [
  'geral',
  'clinica',
  'internacao',
  'imagem',
  'laboratorio',
  'estoque',
  'financeiro'
] as const;

export type SettingNamespace = (typeof ALLOWED_NAMESPACES)[number];

function ensureActor(context: RequestContext) {
  const actor = context.actor;

  if (!actor?.accountId) {
    throw new Error('Actor context is required to access settings.');
  }

  return actor;
}

export function createSettingsService(context: ServiceContext) {
  const repo = createSettingsRepo(context.db);

  return {
    async listByNamespace(namespace: string): Promise<SettingRecord[]> {
      const actor = ensureActor(context.requestContext);
      return repo.findByNamespace(actor.accountId, namespace);
    },

    async upsert(namespace: string, key: string, valueJson: unknown): Promise<SettingRecord> {
      const actor = ensureActor(context.requestContext);

      // Get before value for audit
      const before = await repo.findByKey(actor.accountId, namespace, key);

      const after = await repo.upsert(actor.accountId, namespace, key, valueJson, actor.userId ?? null);

      await append({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'setting',
        entityId: after.id,
        action: 'settings.upsert',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return after;
    }
  };
}
