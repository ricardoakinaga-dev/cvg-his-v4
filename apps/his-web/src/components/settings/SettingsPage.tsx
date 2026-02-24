'use client';

import { useState, useEffect } from 'react';
import { settingsKeys, type Setting, type SettingNamespace } from '../../lib/api/settings';
import { getSettingsByNamespace, upsertSetting } from '../../lib/api/settings';

type SettingsPageProps = {
  namespace: SettingNamespace;
  title: string;
  description: string;
};

function ValueEditor({ 
  value, 
  onChange 
}: { 
  value: unknown; 
  onChange: (value: unknown) => void;
}) {
  const [isJsonMode, setIsJsonMode] = useState(false);
  
  // Handle primitive types
  if (typeof value === 'boolean') {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-600">Ativo</span>
      </label>
    );
  }
  
  if (typeof value === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
      />
    );
  }
  
  if (typeof value === 'string') {
    if (value.includes('\n') || value.length > 100) {
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border font-mono"
        />
      );
    }
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
      />
    );
  }
  
  // Handle objects/arrays with JSON editor
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsJsonMode(!isJsonMode)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {isJsonMode ? 'Editor simples' : 'Editor JSON'}
        </button>
      </div>
      {isJsonMode ? (
        <textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={8}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border font-mono"
        />
      ) : (
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border">
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function SettingCard({ 
  setting, 
  onSave 
}: { 
  setting: Setting;
  onSave: (key: string, value: unknown) => Promise<void>;
}) {
  const [value, setValue] = useState(setting.valueJson);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const handleChange = (newValue: unknown) => {
    setValue(newValue);
    setHasChanges(JSON.stringify(newValue) !== JSON.stringify(setting.valueJson));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(setting.key, value);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{setting.key}</h3>
          <p className="text-sm text-gray-500">
            Atualizado em {new Date(setting.updatedAt).toLocaleString('pt-BR')}
          </p>
        </div>
        {hasChanges && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Não salvo
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        <ValueEditor value={value} onChange={handleChange} />
        
        {hasChanges && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsPage({ namespace, title, description }: SettingsPageProps) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    setIsLoading(true);
    getSettingsByNamespace(namespace)
      .then(setSettings)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [namespace]);
  
  const handleSave = async (key: string, value: unknown) => {
    await upsertSetting(namespace, key, value);
    // Refresh settings
    const updated = await getSettingsByNamespace(namespace);
    setSettings(updated);
  };
  
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Erro ao carregar configurações: {error.message}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-600">{description}</p>
      </div>
      
      <div className="grid gap-6">
        {settings && settings.length > 0 ? (
          settings.map((setting) => (
            <SettingCard 
              key={setting.id} 
              setting={setting} 
              onSave={handleSave}
            />
          ))
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">Nenhuma configuração encontrada para este módulo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
