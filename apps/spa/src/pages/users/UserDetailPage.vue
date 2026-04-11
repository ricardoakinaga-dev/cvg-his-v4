<template>
  <div class="user-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px">
        <SkeletonLoader variant="card" />
      </div>
    </div>

    <DsAlert v-else-if="error" variant="danger">{{ error }}</DsAlert>

    <template v-else-if="user">
      <AppPageHeader>
        <template #title>👤 {{ user.displayName }}</template>
        <template #subtitle>
          <StatusBadge
            :label="user.status === 'active' ? 'Ativo' : 'Inativo'"
            :variant="user.status === 'active' ? 'success' : 'neutral'"
          />
          <span class="muted" style="margin-left: 8px">@{{ user.username }}</span>
        </template>
        <template #actions>
          <DsButton variant="secondary" tag="a" :to="`/users/${user.id}/edit`">Editar</DsButton>
          <DsButton variant="secondary" tag="a" to="/users">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <section class="summary-grid">
        <DsCard v-for="item in summaryCards" :key="item.label" variant="elevated" class="summary-card">
          <div class="summary-card__icon">{{ item.icon }}</div>
          <div class="summary-card__body">
            <span class="summary-card__value">{{ item.value }}</span>
            <span class="summary-card__label">{{ item.label }}</span>
          </div>
        </DsCard>
      </section>

      <AppDetailSection title="Informações do Usuário">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-item__label">Nome Completo</span>
            <span class="detail-item__value">{{ user.displayName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">E-mail</span>
            <span class="detail-item__value">{{ user.email }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Usuário</span>
            <span class="detail-item__value">@{{ user.username }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Perfil</span>
            <span class="detail-item__value">{{ roleLabel(user.roleCode) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Setor</span>
            <span class="detail-item__value">{{ user.department || 'Não informado' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Cargo</span>
            <span class="detail-item__value">{{ user.jobTitle || 'Não informado' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Telefone</span>
            <span class="detail-item__value">{{ user.phone || 'Não informado' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Criado em</span>
            <span class="detail-item__value">{{ formatDateTime(user.createdAt) }}</span>
          </div>
        </div>
      </AppDetailSection>

      <AppDetailSection title="Segurança">
        <div class="mfa-status">
          <div v-if="mfaLoading" class="muted">Carregando status MFA...</div>
          <template v-else>
            <div class="mfa-row">
              <span class="mfa-label">MFA TOTP</span>
              <StatusBadge
                :label="mfaStatus.isActive ? 'Ativo' : 'Inativo'"
                :variant="mfaStatus.isActive ? 'success' : 'neutral'"
              />
            </div>
            <div class="mfa-row">
              <span class="mfa-label">MFA Obrigatório</span>
              <StatusBadge
                :label="mfaStatus.isRequired ? 'Sim' : 'Não'"
                :variant="mfaStatus.isRequired ? 'warning' : 'neutral'"
              />
            </div>
            <div v-if="!mfaStatus.isActive" class="mfa-actions">
              <DsButton variant="primary" size="sm" :loading="mfaActionLoading" @click="initiateMfaSetup">
                Ativar MFA
              </DsButton>
            </div>
            <div v-else class="mfa-actions">
              <DsButton variant="secondary" size="sm" :loading="mfaActionLoading" @click="disableMfa">
                Desativar MFA
              </DsButton>
              <DsButton variant="secondary" size="sm" :loading="mfaActionLoading" @click="regenerateCodes">
                Regenerar Códigos
              </DsButton>
            </div>
            <div v-if="setupData" class="setup-qr">
              <p class="setup-hint">Escaneie o QR Code no seu autenticador:</p>
              <div class="qr-secret">
                <span class="secret-label">Chave secreta:</span>
                <code class="secret-value">{{ setupData.secret }}</code>
              </div>
              <form class="confirm-form" @submit.prevent="confirmMfaSetup">
                <DsInput v-model="setupToken" label="Código do autenticador" placeholder="000000" maxlength="6" required />
                <DsButton variant="primary" size="sm" type="submit" :loading="mfaActionLoading">Confirmar</DsButton>
              </form>
            </div>
            <div v-if="recoveryCodes.length > 0" class="recovery-codes">
              <p class="codes-label">Guarde estes códigos em local seguro:</p>
              <div class="codes-list">
                <code v-for="code in recoveryCodes" :key="code" class="code-item">{{ code }}</code>
              </div>
            </div>
          </template>
          <DsAlert v-if="mfaError" variant="danger" dismissible @dismiss="mfaError = ''">
            {{ mfaError }}
          </DsAlert>
        </div>
      </AppDetailSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { userService } from '@/services/user';
import { mfaService } from '@/services/mfa';
import type { UserSummary } from '@/types/user';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { formatDateTime } from '@/utils/labels';
import AppDetailSection from '@/components/AppDetailSection.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const userId = route.params.id as string;

const user = ref<UserSummary | null>(null);
const loading = ref(true);
const error = ref('');
const mfaLoading = ref(false);
const mfaActionLoading = ref(false);
const mfaError = ref('');
const mfaStatus = ref({ isActive: false, isRequired: false });
const setupData = ref<{ secret: string; qrCodeUrl: string } | null>(null);
const setupToken = ref('');
const recoveryCodes = ref<string[]>([]);

const roleLabelMap: Record<string, string> = {
  admin: '👑 Admin',
  veterinarian: '🩺 Veterinário',
  nurse: '💉 Enfermeiro(a)',
  reception: '🔔 Recepção',
  auditor: '📝 Auditor',
  finance: '💰 Financeiro',
  inventory: '📦 Estoque'
};

function roleLabel(code: string) {
  return roleLabelMap[code] || code;
}

const summaryCards = computed(() => [
  { icon: '🧭', label: 'Perfil', value: roleLabel(user.value?.roleCode ?? '') || '—' },
  { icon: '🏢', label: 'Setor', value: user.value?.department || 'Não informado' },
  { icon: '🔐', label: 'MFA', value: mfaStatus.value.isActive ? 'Ativo' : 'Inativo' },
  { icon: '⚡', label: 'Status', value: user.value?.status === 'active' ? 'Ativo' : 'Inativo' }
]);

async function loadMfaStatus() {
  mfaLoading.value = true;
  mfaError.value = '';
  try {
    mfaStatus.value = await mfaService.getStatus();
  } catch {
    mfaStatus.value = { isActive: false, isRequired: false };
  } finally {
    mfaLoading.value = false;
  }
}

async function initiateMfaSetup() {
  mfaActionLoading.value = true;
  mfaError.value = '';
  try {
    setupData.value = await mfaService.initiateSetup();
  } catch (err: unknown) {
    mfaError.value = err instanceof Error ? err.message : 'Erro ao iniciar setup MFA';
  } finally {
    mfaActionLoading.value = false;
  }
}

async function confirmMfaSetup() {
  if (!setupToken.value.trim()) return;
  mfaActionLoading.value = true;
  mfaError.value = '';
  try {
    await mfaService.confirmSetup(setupToken.value.trim());
    setupData.value = null;
    setupToken.value = '';
    await loadMfaStatus();
  } catch (err: unknown) {
    mfaError.value = err instanceof Error ? err.message : 'Erro ao confirmar MFA';
  } finally {
    mfaActionLoading.value = false;
  }
}

async function disableMfa() {
  const token = prompt('Informe o código TOTP para desativar:');
  if (!token) return;
  mfaActionLoading.value = true;
  mfaError.value = '';
  try {
    await mfaService.disable(token);
    await loadMfaStatus();
  } catch (err: unknown) {
    mfaError.value = err instanceof Error ? err.message : 'Erro ao desativar MFA';
  } finally {
    mfaActionLoading.value = false;
  }
}

async function regenerateCodes() {
  mfaActionLoading.value = true;
  mfaError.value = '';
  try {
    const result = await mfaService.regenerateRecoveryCodes();
    recoveryCodes.value = [...result.recoveryCodes];
  } catch (err: unknown) {
    mfaError.value = err instanceof Error ? err.message : 'Erro ao regenerar códigos';
  } finally {
    mfaActionLoading.value = false;
  }
}

onMounted(async () => {
  try {
    user.value = await userService.getById(userId);
    await loadMfaStatus();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar usuário';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
}

.summary-card__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.08);
  font-size: 22px;
}

.summary-card__body {
  display: flex;
  flex-direction: column;
}

.summary-card__value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1;
}

.summary-card__label {
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
  margin-top: 4px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-item__label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #94a3b8);
}
.detail-item__value {
  font-size: 15px;
  color: var(--color-text, #0f172a);
}

.mfa-status {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mfa-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mfa-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #475569);
  min-width: 120px;
}

.mfa-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.setup-qr {
  padding: 16px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
}

.setup-hint {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin: 0 0 12px;
}

.qr-secret {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.secret-label {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.secret-value {
  font-size: 14px;
  background: var(--color-surface, #fff);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border, #e2e8f0);
}

.confirm-form {
  display: flex;
  gap: 8px;
  align-items: end;
}

.recovery-codes {
  padding: 16px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
}

.codes-label {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin: 0 0 12px;
}

.codes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

@media (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.code-item {
  font-size: 13px;
  background: var(--color-surface, #fff);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-border, #e2e8f0);
  text-align: center;
}
</style>
