<template>
  <div class="api-keys-page">
    <AppPageHeader title="Chaves de API" subtitle="Chaves para integrações externas e acesso premium">
      <template #actions>
        <DsBadge variant="info" size="md" :aria-label="`${apiKeys.length} chaves cadastradas`">
          {{ apiKeys.length }} chaves
        </DsBadge>
      </template>
    </AppPageHeader>

    <div class="api-keys-grid">
      <DsCard title="Nova API Key" class="api-keys-card">
        <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
          {{ formError }}
        </DsAlert>
        <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
          {{ successMessage }}
        </DsAlert>
        <form class="api-keys-form" @submit.prevent="handleCreate">
          <DsInput
            id="api-key-name"
            v-model="form.name"
            label="Nome da chave"
            placeholder="Ex: Integração financeira"
            :error="errors.name"
            required
          />

          <div class="permissions-section">
            <div class="permissions-section__header">
              <span class="permissions-section__title">Permissões</span>
              <span class="permissions-section__count">{{ form.permissions.length }} selecionadas</span>
            </div>
            <DsAlert v-if="permissionsError" variant="warning">
              {{ permissionsError }}
            </DsAlert>
            <div v-if="permissionsLoading" class="permissions-loading">
              Carregando catálogo de permissões...
            </div>
            <div v-else class="permissions-grid">
              <div v-for="group in permissionGroups" :key="group.module" class="permission-group">
                <h3 class="permission-group__title">{{ group.moduleLabel }}</h3>
                <label v-for="permission in group.items" :key="permission.code" class="permission-item">
                  <input
                    type="checkbox"
                    :checked="isPermissionSelected(permission.code)"
                    @change="
                      togglePermission(
                        permission.code,
                        ($event.target as HTMLInputElement).checked
                      )
                    "
                  />
                  <span class="permission-item__label">
                    <strong>{{ permission.code }}</strong>
                    <span>{{ permission.description }}</span>
                  </span>
                </label>
              </div>
            </div>
            <span v-if="errors.permissions" class="api-keys-form__error">{{ errors.permissions }}</span>
          </div>

          <div class="form-row">
            <DsInput
              id="api-key-rate-limit"
              v-model="form.rateLimit"
              type="number"
              label="Rate limit"
              placeholder="120"
              min="1"
            />
            <DsInput
              id="api-key-rate-limit-window"
              v-model="form.rateLimitWindow"
              type="number"
              label="Janela (segundos)"
              placeholder="3600"
              min="60"
            />
          </div>

          <DsInput
            id="api-key-expires-at"
            v-model="form.expiresAt"
            type="date"
            label="Expira em"
          />

          <div class="form-actions">
            <DsButton type="submit" variant="primary" :loading="submitting">
              {{ submitting ? 'Criando...' : 'Criar API Key' }}
            </DsButton>
          </div>
        </form>

        <DsCard v-if="createdRawKey" variant="outlined" title="Segredo gerado" class="secret-card">
          <DsAlert variant="warning">
            Esta chave só é exibida agora. Copie e armazene em local seguro.
          </DsAlert>
          <DsInput
            id="api-key-secret"
            v-model="createdRawKey"
            label="API Key"
            readonly
          />
        </DsCard>
      </DsCard>

      <DsCard title="Chaves existentes" class="api-keys-card">
        <DsAlert v-if="listError" variant="danger" dismissible @dismiss="listError = ''">
          {{ listError }}
        </DsAlert>

        <DataTable
          :columns="columns"
          :rows="apiKeys"
          :loading="listLoading"
          empty-icon="🔐"
          empty-title="Nenhuma API key encontrada"
          empty-description="Crie a primeira chave para habilitar integrações externas."
          variant="hoverable"
        >
          <template #cell-permissions="{ row }">
            <span class="permissions-count">
              {{ (row as ApiKeySummary).permissions.length }} permissões
            </span>
          </template>
          <template #cell-isActive="{ row }">
            <StatusBadge
              :label="(row as ApiKeySummary).isActive ? 'Ativa' : 'Inativa'"
              :variant="(row as ApiKeySummary).isActive ? 'success' : 'danger'"
            />
          </template>
          <template #cell-lastUsedAt="{ row }">
            {{ formatDate((row as ApiKeySummary).lastUsedAt) }}
          </template>
          <template #cell-actions="{ row }">
            <code class="api-key-prefix">{{ (row as ApiKeySummary).keyPrefix }}</code>
          </template>
        </DataTable>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { useFormValidation } from '@/composables/useFormValidation';
import { accessControlService } from '@/services/accessControl';
import { apiKeysService } from '@/services/apiKeys';
import type { ApiKeySummary } from '@cvg-his-v2/shared-types';
import type { PermissionDefinition } from '@cvg-his-v2/shared-types';

const FALLBACK_PERMISSIONS: PermissionDefinition[] = [
  { id: 'perm-1' as never, code: 'api_keys.manage', module: 'integrations', description: 'Gerenciar chaves de API' },
  { id: 'perm-2' as never, code: 'integrations.read', module: 'integrations', description: 'Ler catálogo de integrações' },
  { id: 'perm-3' as never, code: 'integrations.manage', module: 'integrations', description: 'Gerenciar integrações' },
  { id: 'perm-4' as never, code: 'notifications.read', module: 'notifications', description: 'Ler notificações' },
  { id: 'perm-5' as never, code: 'notifications.manage', module: 'notifications', description: 'Gerenciar notificações' },
  { id: 'perm-6' as never, code: 'payments.manage', module: 'payments', description: 'Gerenciar pagamentos' },
  { id: 'perm-7' as never, code: 'webhooks.manage', module: 'webhooks', description: 'Gerenciar webhooks' },
  { id: 'perm-8' as never, code: 'webhooks.read', module: 'webhooks', description: 'Ler webhooks' }
];

const apiKeys = ref<ApiKeySummary[]>([]);
const listLoading = ref(true);
const listError = ref('');
const permissions = ref<PermissionDefinition[]>([]);
const permissionsLoading = ref(true);
const permissionsError = ref('');
const createdRawKey = ref('');
const successMessage = ref('');

const form = reactive({
  name: '',
  permissions: [] as string[],
  rateLimit: '' as string | number,
  rateLimitWindow: '' as string | number,
  expiresAt: ''
});

const validation = useFormValidation({
  rules: {
    name: [(value: unknown) => (!(value as string)?.trim() ? 'Nome da chave é obrigatório' : null)],
    permissions: [
      (value: unknown) => ((Array.isArray(value) && value.length > 0) ? null : 'Selecione ao menos uma permissão')
    ]
  }
});

const { errors, formError, submitting, validate } = validation;

const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'keyPrefix', label: 'Prefixo' },
  { key: 'permissions', label: 'Permissões' },
  { key: 'isActive', label: 'Status' },
  { key: 'lastUsedAt', label: 'Último uso' },
  { key: 'actions', label: 'Chave' }
];

const permissionGroups = computed(() => {
  const items = [...permissions.value].sort((a, b) => {
    if (a.module === b.module) return a.code.localeCompare(b.code);
    return a.module.localeCompare(b.module);
  });

  const grouped = new Map<string, PermissionDefinition[]>();
  for (const permission of items) {
    const current = grouped.get(permission.module) ?? [];
    current.push(permission);
    grouped.set(permission.module, current);
  }

  return [...grouped.entries()].map(([module, items]) => ({
    module,
    moduleLabel: module.replace(/_/g, ' ').toUpperCase(),
    items
  }));
});

async function loadKeys() {
  listLoading.value = true;
  listError.value = '';
  try {
    apiKeys.value = await apiKeysService.list();
  } catch (err: unknown) {
    listError.value = err instanceof Error ? err.message : 'Erro ao carregar API keys';
  } finally {
    listLoading.value = false;
  }
}

async function loadPermissions() {
  permissionsLoading.value = true;
  permissionsError.value = '';
  try {
    const catalog = await accessControlService.listPermissions();
    permissions.value = catalog.length > 0 ? catalog : FALLBACK_PERMISSIONS;
  } catch (err: unknown) {
    permissions.value = FALLBACK_PERMISSIONS;
    permissionsError.value =
      err instanceof Error
        ? `${err.message}. Catálogo exibido a partir da lista padrão.`
        : 'Catálogo de permissões indisponível. Lista padrão carregada.';
  } finally {
    permissionsLoading.value = false;
  }
}

async function handleCreate() {
  if (!validate({ name: form.name, permissions: form.permissions })) return;

  submitting.value = true;
  formError.value = '';
  successMessage.value = '';

  try {
    const created = await apiKeysService.create({
      name: form.name.trim(),
      permissions: [...form.permissions],
      rateLimit: form.rateLimit === '' ? undefined : Number(form.rateLimit),
      rateLimitWindow: form.rateLimitWindow === '' ? undefined : Number(form.rateLimitWindow),
      expiresAt: form.expiresAt || undefined
    });

    createdRawKey.value = created.rawKey;
    successMessage.value = `Chave ${created.apiKey.name} criada com sucesso.`;
    form.permissions = [];
    form.name = '';
    form.rateLimit = '';
    form.rateLimitWindow = '';
    form.expiresAt = '';
    await loadKeys();
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao criar API key';
  } finally {
    submitting.value = false;
  }
}

function formatDate(value: string | null): string {
  if (!value) return 'Nunca';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function isPermissionSelected(code: string): boolean {
  return form.permissions.includes(code);
}

function togglePermission(code: string, checked: boolean): void {
  if (checked) {
    if (!form.permissions.includes(code)) {
      form.permissions.push(code);
    }
    return;
  }

  form.permissions = form.permissions.filter((permission) => permission !== code);
}

onMounted(async () => {
  await Promise.all([loadKeys(), loadPermissions()]);
});
</script>

<style scoped>
.api-keys-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.api-keys-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 20px;
}

.api-keys-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.api-keys-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.permissions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.permissions-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.permissions-section__title {
  font-size: 14px;
  font-weight: 500;
}

.permissions-section__count {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.permissions-loading {
  padding: 16px;
  color: var(--color-text-muted, #64748b);
  background: var(--color-bg-subtle, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
}

.permissions-grid {
  display: grid;
  gap: 16px;
}

.permission-group {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  background: var(--color-bg-subtle, #f8fafc);
}

.permission-group__title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, #64748b);
}

.permission-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 13px;
  color: var(--color-text-secondary, #475569);
  cursor: pointer;
}

.permission-item input {
  margin-top: 3px;
}

.permission-item__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.api-keys-form__error {
  font-size: 12px;
  color: var(--color-danger-600, #dc2626);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.secret-card {
  margin-top: 8px;
}

.permissions-count {
  font-weight: 500;
}

.api-key-prefix {
  font-size: 12px;
  color: var(--color-text-secondary, #475569);
}

@media (max-width: 1100px) {
  .api-keys-grid {
    grid-template-columns: 1fr;
  }
}
</style>
