<template>
  <div class="api-client-page">
    <AppPageHeader title="Cliente API" subtitle="Ferramenta de apoio para integrações, headers e saúde da API">
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
        </div>
        <div class="actions-row">
          <DsButton variant="primary" :loading="loading" @click="reloadHealth">Executar health</DsButton>
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
import { AUTH_STORAGE_KEYS } from '@cvg-his-v2/shared-auth-sdk';

const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const health = ref<{ ok?: boolean; service?: string; version?: string; environment?: string; timestamp?: string }>({});
const correlationId = ref(`spa-${Date.now()}`);

const apiBaseLabel = computed(() => import.meta.env.VITE_API_BASE_URL || 'mesma origem');
const hasAccessToken = computed(() => localStorage.getItem(AUTH_STORAGE_KEYS.accessToken) != null);
const hasRefreshToken = computed(() => localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken) != null);
const isLoggedIn = computed(() => hasAccessToken.value);

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
</style>
