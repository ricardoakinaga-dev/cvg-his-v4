/**
 * Settings API Client
 * 
 * Provides functions for managing settings by namespace
 */

import { api } from './client';

export type Setting = {
  id: string;
  accountId: string;
  namespace: string;
  key: string;
  valueJson: unknown;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SettingNamespace = 
  | 'geral'
  | 'clinica'
  | 'internacao'
  | 'imagem'
  | 'laboratorio'
  | 'estoque'
  | 'financeiro';

/**
 * Get all settings for a namespace
 */
export async function getSettingsByNamespace(namespace: SettingNamespace): Promise<Setting[]> {
  return api.get<Setting[]>(`/settings/${namespace}`);
}

/**
 * Upsert a setting value
 */
export async function upsertSetting(
  namespace: SettingNamespace,
  key: string,
  valueJson: unknown
): Promise<Setting> {
  return api.put<Setting>(`/settings/${namespace}/${key}`, { value_json: valueJson });
}

/**
 * Hook-compatible query key factory for settings
 */
export const settingsKeys = {
  all: ['settings'] as const,
  namespace: (namespace: SettingNamespace) => ['settings', namespace] as const,
};
