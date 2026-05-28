<template>
  <div class="lgpd-page">
    <AppPageHeader
      :breadcrumbs="['Console Enterprise', 'Governança', 'LGPD']"
      title="LGPD"
      subtitle="Consentimento, direitos do titular e governança de dados — Console Enterprise"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <!-- Hub: KPI StatCards -->
    <section class="hub-kpis">
      <DsStatCard :label="consentGrantedCount + '/' + purposes.length + ' consent(s) ativo(s)'" value="" icon="✅" />
      <DsStatCard :label="pendingDsrCount + ' solicitaçao(s) pendente(s)'" value="" icon="⏳" :error="pendingDsrCount > 0 ? 'Há solicitações aguardando' : undefined" />
      <DsStatCard :label="completedDsrCount + ' completa(s)'" value="" icon="🎯" />
      <DsStatCard :label="dsrTotalCount + ' solicitaçao(s) total'" value="" icon="📋" />
    </section>

    <!-- Hub: Operational Alerts -->
    <section v-if="lgpdAlerts.length > 0" class="hub-alerts">
      <DsAlert
        v-for="(alert, i) in lgpdAlerts"
        :key="i"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> — {{ alert.message }}
      </DsAlert>
    </section>

    <!-- Hub: Quick Actions -->
    <section class="hub-actions">
      <DsCard title="Ações rápidas" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" icon="📋" @click="activeTab = 'dsr'">
            Nova Solicitaçao
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/audit" icon="🧾">
            Auditoria
          </DsButton>
          <DsButton variant="ghost" :loading="loading" @click="reload" icon="🔄">
            Atualizar
          </DsButton>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <!-- Tabs -->
    <DsTabs
      v-model="activeTab"
      :tabs="tabs"
      aria-label="Seções LGPD"
    />

    <!-- Tab: Consentimento -->
    <div v-if="activeTab === 'consent'" class="tab-panel">
      <DsCard title="Consentimentos do titular">
        <p class="muted" style="margin-bottom: 16px">
          Gerencie o consentimento para cada finalidade de tratamento de dados pessoais.
          Conforme a LGPD (Lei 13.709/2018), o titular deve consentir de forma livre,
          informada e inequívoca.
        </p>
        <div class="consent-grid">
          <div v-for="purpose in purposes" :key="purpose.key" class="consent-item">
            <div class="consent-item__header">
              <span class="consent-item__icon">{{ purpose.icon }}</span>
              <div>
                <strong>{{ purpose.label }}</strong>
                <p class="muted" style="font-size: 12px; margin: 2px 0 0">{{ purpose.description }}</p>
              </div>
            </div>
            <div class="consent-item__actions">
              <span :class="['consent-badge', consentStatus[purpose.key] ? 'consent-badge--granted' : 'consent-badge--revoked']">
                {{ consentStatus[purpose.key] ? 'Concedido' : 'Não concedido' }}
              </span>
              <DsButton
                size="sm"
                :variant="consentStatus[purpose.key] ? 'secondary' : 'primary'"
                :loading="actionLoading === purpose.key"
                @click="toggleConsent(purpose.key)"
              >
                {{ consentStatus[purpose.key] ? 'Revogar' : 'Conceder' }}
              </DsButton>
            </div>
          </div>
        </div>
      </DsCard>
    </div>

    <!-- Tab: Solicitações DSR -->
    <div v-if="activeTab === 'dsr'" class="tab-panel">
      <div class="dsr-layout">
        <DsCard title="Criar nova solicitação">
          <form class="dsr-form" @submit.prevent="submitDsr">
            <DsInput v-model="dsrForm.subjectId" label="ID do titular" placeholder="ID do owner, paciente ou usuário" required />
            <DsInput v-model="dsrForm.subjectType" type="select" label="Tipo de titular">
              <option value="owner">Tutor</option>
              <option value="patient">Paciente</option>
              <option value="user">Usuário</option>
            </DsInput>
            <DsInput v-model="dsrForm.requestType" type="select" label="Tipo de solicitação">
              <option value="data_access">Acesso aos dados</option>
              <option value="data_export">Exportação de dados</option>
              <option value="data_rectification">Rectificação</option>
              <option value="data_portability">Portabilidade</option>
              <option value="data_deletion">Exclusão/Anonimização</option>
              <option value="consent_revocation">Revogação de consentimento</option>
            </DsInput>
            <DsInput v-model="dsrForm.notes" type="textarea" label="Observações" :rows="3" placeholder="Detalhes adicionais da solicitação" />
            <div class="form-actions">
              <DsButton variant="primary" type="submit" :loading="submittingDsr">
                Enviar solicitação
              </DsButton>
            </div>
          </form>
        </DsCard>

        <DsCard title="Solicitações recentes">
          <div class="toolbar">
            <DsInput v-model="dsrFilter" type="select" style="max-width: 180px">
              <option value="">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Completas</option>
              <option value="rejected">Rejeitadas</option>
            </DsInput>
          </div>
          <DataTable
            :columns="dsrColumns"
            :rows="filteredDsrRequests"
            :loading="loadingDsr"
            empty-icon="📋"
            empty-title="Nenhuma solicitação"
            empty-description="Crie a primeira solicitação de titular de dados."
            variant="hoverable"
          >
            <template #cell-status="{ row }">
              <StatusBadge
                :label="dsrStatusLabel((row as DsrRecord).status)"
                :variant="dsrStatusVariant((row as DsrRecord).status)"
              />
            </template>
            <template #cell-requestType="{ row }">
              {{ dsrTypeLabel((row as DsrRecord).requestType) }}
            </template>
            <template #cell-actions="{ row }">
              <div class="row-actions">
                <DsButton
                  size="sm"
                  variant="ghost"
                  @click="selectedDsr = row as DsrRecord"
                >
                  Detalhes
                </DsButton>
                <DsButton
                  v-if="(row as DsrRecord).status === 'pending' || (row as DsrRecord).status === 'in_progress'"
                  size="sm"
                  variant="primary"
                  :loading="dsrActionLoading === (row as DsrRecord).id + '-complete'"
                  @click="completeDsr((row as DsrRecord).id)"
                >
                  Completar
                </DsButton>
                <DsButton
                  v-if="(row as DsrRecord).status === 'pending'"
                  size="sm"
                  variant="secondary"
                  :loading="dsrActionLoading === (row as DsrRecord).id + '-reject'"
                  @click="rejectDsr((row as DsrRecord).id)"
                >
                  Rejeitar
                </DsButton>
              </div>
            </template>
          </DataTable>

          <section v-if="selectedDsr" class="dsr-detail" aria-label="Detalhe da DSR">
            <div class="dsr-detail__header">
              <div>
                <strong>{{ selectedDsr.id }}</strong>
                <p class="muted">Titular {{ selectedDsr.subjectId }} · {{ dsrTypeLabel(selectedDsr.requestType) }}</p>
              </div>
              <StatusBadge
                :label="dsrStatusLabel(selectedDsr.status)"
                :variant="dsrStatusVariant(selectedDsr.status)"
              />
            </div>
            <div class="retention-list">
              <div v-for="item in selectedDsrRetentionEvidence" :key="item.dataType" class="retention-item">
                <span>{{ retentionLabel(item.dataType) }}</span>
                <strong>{{ item.retentionWindow }}</strong>
                <small>{{ dispositionLabel(item.disposition) }}</small>
              </div>
            </div>
          </section>
        </DsCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsTabs from '@cvg-his-v2/design-system/vue/DsTabs.vue';
import { lgpdService, type ConsentPurpose, type DsrRecord, type DsrStatus } from '@/services/lgpd';
import { useAuthStore } from '@/stores/auth';
import type { DataTableColumn } from '@/components/DataTable.vue';

const auth = useAuthStore();
const activeTab = ref<string | number>('consent');
const loading = ref(false);
const loadingDsr = ref(false);
const error = ref('');
const actionLoading = ref('');
const submittingDsr = ref(false);
const dsrActionLoading = ref('');
const dsrFilter = ref('');

const consentStatus = ref<Record<string, boolean>>({});
const dsrRequests = ref<DsrRecord[]>([]);
const selectedDsr = ref<DsrRecord | null>(null);

const purposes = [
  { key: 'clinical' as ConsentPurpose, label: 'Clínico', icon: '🩺', description: 'Tratamento de dados clínicos e de saúde' },
  { key: 'financial' as ConsentPurpose, label: 'Financeiro', icon: '💰', description: 'Dados financeiros e de cobrança' },
  { key: 'operational' as ConsentPurpose, label: 'Operacional', icon: '⚙️', description: 'Operações do sistema e suporte' },
  { key: 'marketing' as ConsentPurpose, label: 'Marketing', icon: '📢', description: 'Comunicações promocionais e marketing' },
  { key: 'analytics' as ConsentPurpose, label: 'Analytics', icon: '📊', description: 'Análise de dados e melhorias' },
  { key: 'notifications' as ConsentPurpose, label: 'Notificações', icon: '🔔', description: 'Alertas e notificações ao titular' }
];

const dsrForm = ref({
  subjectId: '',
  subjectType: 'owner' as const,
  requestType: 'data_access' as const,
  notes: ''
});

const tabs = computed(() => [
  { key: 'consent', label: 'Consentimento', count: consentGrantedCount.value },
  { key: 'dsr', label: 'Solicitações', count: dsrRequests.value.length }
]);

const consentGrantedCount = computed(() => Object.values(consentStatus.value).filter(Boolean).length);
const pendingDsrCount = computed(() => dsrRequests.value.filter((r) => r.status === 'pending' || r.status === 'in_progress').length);
const completedDsrCount = computed(() => dsrRequests.value.filter((r) => r.status === 'completed').length);
const dsrTotalCount = computed(() => dsrRequests.value.length);

interface LgpdAlert {
  variant: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
}

const lgpdAlerts = computed<LgpdAlert[]>(() => {
  const alerts: LgpdAlert[] = [];
  const missingClinical = !consentStatus.value['clinical'];
  if (missingClinical) {
    alerts.push({ variant: 'warning', title: 'Consentimento clínico pendente', message: 'O consentimento clínico ainda não foi concedido. Dados clínicos não poderão ser tratados.' });
  }
  if (pendingDsrCount.value > 0) {
    alerts.push({ variant: 'info', title: 'DSRs pendentes', message: `${pendingDsrCount.value} solicitação(ões) de titular aguardando processamento.` });
  }
  if (consentGrantedCount.value === purposes.length) {
    alerts.push({ variant: 'success', title: 'Todos os consentimentos concedidos', message: 'O titular concedeu consentimento para todas as finalidades.' });
  }
  return alerts;
});

const dsrColumns: DataTableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'subjectId', label: 'Titular' },
  { key: 'subjectType', label: 'Tipo' },
  { key: 'requestType', label: 'Solicitação' },
  { key: 'status', label: 'Status' },
  { key: 'requestedAt', label: 'Criada em' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const filteredDsrRequests = computed(() => {
  if (!dsrFilter.value) return dsrRequests.value;
  return dsrRequests.value.filter((r) => r.status === dsrFilter.value);
});

const selectedDsrRetentionEvidence = computed(() => {
  const result = selectedDsr.value?.resultJson;
  if (!result || typeof result !== 'object') return [];
  const evidence = (result as { retentionEvidence?: unknown }).retentionEvidence;
  return Array.isArray(evidence) ? evidence as RetentionEvidenceItem[] : [];
});

interface RetentionEvidenceItem {
  readonly dataType: string;
  readonly retentionWindow: string;
  readonly disposition: string;
}

const dsrStatusLabelMap: Record<DsrStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Completa',
  rejected: 'Rejeitada'
};

const dsrTypeLabelMap: Record<string, string> = {
  data_access: 'Acesso',
  data_export: 'Exportação',
  data_rectification: 'Rectificação',
  data_portability: 'Portabilidade',
  data_deletion: 'Exclusão',
  data_anonymization: 'Anonimização',
  consent_revocation: 'Revogação de consentimento'
};

function dsrStatusLabel(s: DsrStatus) {
  return dsrStatusLabelMap[s] || s;
}

function dsrStatusVariant(s: DsrStatus) {
  const map: Record<DsrStatus, 'info' | 'warning' | 'success' | 'danger'> = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    rejected: 'danger'
  };
  return map[s] || 'neutral';
}

function dsrTypeLabel(t: string) {
  return dsrTypeLabelMap[t] || t;
}

function retentionLabel(dataType: string) {
  const map: Record<string, string> = {
    owner_profile: 'Tutor',
    patient_profile: 'Paciente',
    clinical_encounters: 'Atendimentos',
    financial_records: 'Financeiro',
    laboratory_results: 'Laboratório',
    clinical_attachments: 'Anexos'
  };
  return map[dataType] || dataType;
}

function dispositionLabel(disposition: string) {
  const map: Record<string, string> = {
    retain: 'Retenção obrigatória',
    anonymize_after_window: 'Anonimizar após janela legal',
    purge_after_window: 'Expurgar após janela legal'
  };
  return map[disposition] || disposition;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateStr));
}

async function loadConsentStatus() {
  const userId = auth.user.id;
  if (!userId) return;
  try {
    consentStatus.value = await lgpdService.getConsentStatus(userId, 'user');
  } catch {
    consentStatus.value = {};
  }
}

async function loadDsrRequests() {
  loadingDsr.value = true;
  try {
    dsrRequests.value = await lgpdService.listDsrRequests();
    if (selectedDsr.value) {
      selectedDsr.value = dsrRequests.value.find((request) => request.id === selectedDsr.value?.id) ?? null;
    }
  } catch {
    dsrRequests.value = [];
  } finally {
    loadingDsr.value = false;
  }
}

async function toggleConsent(purpose: string) {
  actionLoading.value = purpose;
  error.value = '';
  const userId = auth.user.id;
  if (!userId) return;
  try {
    if (consentStatus.value[purpose]) {
      await lgpdService.revokeConsent({ subjectId: userId, subjectType: 'user', purpose: purpose as ConsentPurpose });
    } else {
      await lgpdService.grantConsent({ subjectId: userId, subjectType: 'user', purpose: purpose as ConsentPurpose });
    }
    await loadConsentStatus();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao gerenciar consentimento';
  } finally {
    actionLoading.value = '';
  }
}

async function submitDsr() {
  if (!dsrForm.value.subjectId.trim()) {
    error.value = 'ID do titular é obrigatório';
    return;
  }
  submittingDsr.value = true;
  error.value = '';
  try {
    await lgpdService.createDsrRequest({
      subjectId: dsrForm.value.subjectId.trim(),
      subjectType: dsrForm.value.subjectType,
      requestType: dsrForm.value.requestType as never,
      notes: dsrForm.value.notes.trim() || undefined
    });
    dsrForm.value = { subjectId: '', subjectType: 'owner', requestType: 'data_access', notes: '' };
    selectedDsr.value = null;
    await loadDsrRequests();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao criar solicitação';
  } finally {
    submittingDsr.value = false;
  }
}

async function completeDsr(requestId: string) {
  dsrActionLoading.value = requestId + '-complete';
  try {
    await lgpdService.completeDsrRequest(requestId);
    await loadDsrRequests();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao completar solicitação';
  } finally {
    dsrActionLoading.value = '';
  }
}

async function rejectDsr(requestId: string) {
  dsrActionLoading.value = requestId + '-reject';
  try {
    await lgpdService.rejectDsrRequest(requestId, 'Solicitação rejeitada pelo operador');
    await loadDsrRequests();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao rejeitar solicitação';
  } finally {
    dsrActionLoading.value = '';
  }
}

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([loadConsentStatus(), loadDsrRequests()]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao recarregar dados LGPD';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void reload();
});
</script>

<style scoped>
.lgpd-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hub-actions {
  margin-bottom: 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-panel {
  margin-top: 16px;
}

.consent-grid {
  display: grid;
  gap: 12px;
}

.consent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-subtle, #f8fafc);
  gap: 12px;
  flex-wrap: wrap;
}

.consent-item__header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.consent-item__icon {
  font-size: 20px;
  line-height: 1;
}

.consent-item__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.consent-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.consent-badge--granted {
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
}

.consent-badge--revoked {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-600, #64748b);
}

.dsr-layout {
  display: grid;
  gap: 16px;
}

.dsr-form {
  display: grid;
  gap: 12px;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dsr-detail {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.dsr-detail__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.retention-list {
  display: grid;
  gap: 8px;
}

.retention-item {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(180px, 2fr) minmax(140px, 1fr);
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.retention-item small {
  color: var(--color-text-muted, #64748b);
}

@media (max-width: 720px) {
  .retention-item {
    grid-template-columns: 1fr;
  }
}

.muted {
  color: var(--color-text-muted, #64748b);
}
</style>
