<template>
  <div class="api-client-page">
    <AppPageHeader title="Cliente API" subtitle="Diagnóstico, health check e apoio operacional às integrações enterprise">
      <template #actions>
        <DsBadge variant="info" size="md">{{ apiBaseLabel }}</DsBadge>
        <DsButton variant="secondary" :loading="loading" @click="reloadHealth">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="overview-grid">
      <div class="overview-card">
        <span class="overview-card__value">{{ isLoggedIn ? 'Sim' : 'Não' }}</span>
        <span class="overview-card__label">Sessão autenticada</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ hasAccessToken ? 'Sim' : 'Não' }}</span>
        <span class="overview-card__label">Access token local</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ hasRefreshToken ? 'Sim' : 'Não' }}</span>
        <span class="overview-card__label">Refresh token local</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ health.ok ? 'OK' : '—' }}</span>
        <span class="overview-card__label">Status da API</span>
      </div>
    </section>

    <section class="api-client-actions">
      <DsCard title="Ações rápidas — console enterprise" variant="compact">
        <div class="quick-actions">
          <DsButton tag="a" to="/api-keys" variant="primary">Chaves de API</DsButton>
          <DsButton tag="a" to="/webhooks" variant="secondary">Webhooks</DsButton>
          <DsButton tag="a" to="/audit" variant="secondary">Auditoria</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="api-client-intelligence">
      <DsCard title="Leitura de sessão e conectividade">
        <div class="insights-grid">
          <div v-for="card in insightCards" :key="card.label" class="insight-card">
            <span class="insight-card__label">{{ card.label }}</span>
            <strong class="insight-card__value">{{ card.value }}</strong>
            <span class="insight-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="workspace">
      <DsCard title="Diagnóstico" class="panel">
        <div class="stack">
          <div>
            <strong>Base URL</strong>
            <p>{{ apiBaseLabel }}</p>
          </div>
          <div>
            <strong>Correlation</strong>
            <p>{{ correlationId }}</p>
          </div>
          <div>
            <strong>Cabecalhos padrão</strong>
            <p>Authorization, X-Correlation-Id, X-Request-Id, x-account-id</p>
          </div>
        </div>
      </DsCard>

      <DsCard title="Health check" class="panel">
        <div class="stack">
          <div><strong>Serviço</strong> {{ health.service || '—' }}</div>
          <div><strong>Ambiente</strong> {{ health.environment || '—' }}</div>
          <div><strong>Versão</strong> {{ health.version || '—' }}</div>
          <div><strong>Timestamp</strong> {{ health.timestamp || '—' }}</div>
          <div><strong>Correlation retornada</strong> {{ health.correlationId || '—' }}</div>
        </div>
        <div class="actions-row">
          <DsButton variant="primary" :loading="loading" @click="reloadHealth">Executar health</DsButton>
        </div>
      </DsCard>

      <DsCard title="Sessão e headers" class="panel">
        <div class="stack">
          <div><strong>Conta inferida</strong> {{ tokenAccountId || '—' }}</div>
          <div><strong>Expiração do token</strong> {{ tokenExpiresAt || '—' }}</div>
          <div><strong>Último correlation local</strong> {{ correlationId }}</div>
          <div><strong>Checks na sessão</strong> {{ String(healthHistory.length) }}</div>
        </div>
      </DsCard>

      <DsCard title="Exemplo de uso" class="panel">
        <div class="code-grid">
          <div>
            <h3>fetch</h3>
            <pre>{{ fetchSnippet }}</pre>
          </div>
          <div>
            <h3>curl</h3>
            <pre>{{ curlSnippet }}</pre>
          </div>
        </div>
      </DsCard>

      <DsCard title="Histórico local de health checks" class="panel">
        <div v-if="healthHistory.length" class="history-list">
          <div v-for="item in healthHistory" :key="item.id" class="history-item">
            <strong>{{ item.ok ? 'OK' : 'Falha' }}</strong>
            <span>{{ item.environment || 'sem ambiente' }}</span>
            <span>{{ formatDate(item.timestamp) }}</span>
            <code>{{ item.correlationId }}</code>
          </div>
        </div>
        <div v-else class="muted">Os health checks executados nesta sessão aparecerão aqui.</div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { apiRequest } from '@/services/api';
import { spaRuntimeConfig } from '@/config/runtime';
import { AUTH_STORAGE_KEYS } from '@cvg-his-v2/shared-auth-sdk';

interface HealthSnapshot {
  id: string;
  ok: boolean;
  environment?: string;
  timestamp: string;
  correlationId: string;
}

const HEALTH_HISTORY_STORAGE_KEY = 'cvg-his-v2:api-client-health-history';
const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const health = ref<{ ok?: boolean; service?: string; version?: string; environment?: string; timestamp?: string; correlationId?: string }>({});
const correlationId = ref(`spa-${Date.now()}`);
const healthHistory = ref<HealthSnapshot[]>(loadHealthHistory());

const apiBaseLabel = computed(() => spaRuntimeConfig.apiBaseUrl || 'mesma origem');
const accessToken = computed(() => localStorage.getItem(AUTH_STORAGE_KEYS.accessToken));
const hasAccessToken = computed(() => accessToken.value != null);
const hasRefreshToken = computed(() => localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken) != null);
const isLoggedIn = computed(() => hasAccessToken.value);
const decodedTokenPayload = computed<Record<string, unknown> | null>(() => decodeTokenPayload(accessToken.value));
const tokenAccountId = computed(
  () => (decodedTokenPayload.value?.accountId as string) ?? (decodedTokenPayload.value?.account_id as string) ?? ''
);
const tokenExpiresAt = computed(() => {
  const exp = decodedTokenPayload.value?.exp;
  if (typeof exp !== 'number') return '';
  return formatDate(new Date(exp * 1000).toISOString());
});
const insightCards = computed(() => [
  {
    label: 'API base',
    value: apiBaseLabel.value,
    hint: 'Origem usada pela SPA para chamadas API'
  },
  {
    label: 'Conta inferida',
    value: tokenAccountId.value || 'Não identificada',
    hint: 'Derivada do access token local'
  },
  {
    label: 'Token expira em',
    value: tokenExpiresAt.value || 'Sem expiração visível',
    hint: 'Leitura local do JWT quando disponível'
  },
  {
    label: 'Checks com sucesso',
    value: String(healthHistory.value.filter((item) => item.ok).length),
    hint: 'Health checks positivos nesta sessão'
  }
]);

const fetchSnippet = computed(() => `await fetch('${apiBaseLabel.value}/api/health', {
  headers: {
    Authorization: 'Bearer <access-token>',
    'X-Correlation-Id': '${correlationId.value}'
  }
})`);

const curlSnippet = computed(() => `curl -H 'Authorization: Bearer <access-token>' \\
  -H 'X-Correlation-Id: ${correlationId.value}' \\
  ${apiBaseLabel.value}/api/health`);

async function reloadHealth() {
  loading.value = true;
  error.value = '';
  try {
    health.value = await apiRequest('/health', { skipAuth: true });
    registerHealthSnapshot();
    successMessage.value = 'Health check atualizado com sucesso';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao consultar health';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void reloadHealth();
});

function decodeTokenPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function registerHealthSnapshot() {
  const snapshot: HealthSnapshot = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ok: Boolean(health.value.ok),
    environment: health.value.environment,
    timestamp: health.value.timestamp ?? new Date().toISOString(),
    correlationId: health.value.correlationId ?? correlationId.value
  };
  healthHistory.value = [snapshot, ...healthHistory.value].slice(0, 6);
  persistHealthHistory(healthHistory.value);
}

function loadHealthHistory(): HealthSnapshot[] {
  try {
    const raw = sessionStorage.getItem(HEALTH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HealthSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHealthHistory(items: HealthSnapshot[]) {
  try {
    sessionStorage.setItem(HEALTH_HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // noop
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}
</script>

<style scoped>
.api-client-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-card__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
}

.workspace {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.api-client-actions {
  margin-bottom: 0;
}

.api-client-intelligence {
  margin-bottom: 0;
}

.panel {
  border-radius: 18px;
}

.stack {
  display: grid;
  gap: 10px;
}

.stack p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
  word-break: break-word;
}

.actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.insight-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.insight-card__label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.insight-card__value {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  font-weight: 800;
  word-break: break-word;
}

.insight-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.code-grid {
  display: grid;
  gap: 12px;
}

pre {
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  background: #0f172a;
  color: #e2e8f0;
  overflow: auto;
  font-size: 12px;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.muted {
  color: var(--color-text-muted, #64748b);
}
</style>
