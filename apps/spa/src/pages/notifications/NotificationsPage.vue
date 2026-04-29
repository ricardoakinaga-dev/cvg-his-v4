<template>
  <div class="marketing-campaigns-page">
    <AppPageHeader
      title="Campanhas de SMS Marketing"
      :breadcrumbs="['Marketing', 'Envios', 'Campanhas de SMS Marketing']"
      subtitle="Consulta e preparação segura de campanhas de SMS, sem disparo real"
      :primary-action="{ label: 'Enviar Campanha', disabled: true }"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/marketing/sms">Envio de SMS Simples</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="warning">
      Superfície segura para preservar a ordem Vetus de Marketing. Criar, enviar e consumir saldo de SMS permanecem
      bloqueados até existir contrato auditável de campanha e provedor.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="draftMessage" variant="success" dismissible @dismiss="draftMessage = ''">{{ draftMessage }}</DsAlert>

    <section class="marketing-campaigns-summary-grid" aria-label="Resumo de campanhas SMS">
      <DsStatCard label="Seu saldo é de 0 SMS disponíveis para envio" value="Saldo" />
      <DsStatCard :label="`${visibleCampaignRows.length} campanha(s)`" value="Histórico" />
      <DsStatCard :label="`${queuedJobs.length} jobs em fila`" value="Fila interna" />
      <DsStatCard label="Envio real bloqueado" value="Segurança" />
    </section>

    <form class="marketing-campaigns-search" aria-label="Filtros de campanha SMS" @submit.prevent="searchCampaigns">
      <DsInput
        id="marketing-campaign-search"
        v-model="descriptionSearch"
        label="Descrição"
        placeholder="Pesquisar por descrição ou título"
      />
      <DsInput id="marketing-campaign-date-from" v-model="dateFrom" label="Data de" type="date" />
      <DsInput id="marketing-campaign-date-to" v-model="dateTo" label="Até" type="date" />
      <div class="marketing-campaigns-search__actions">
        <DsButton id="marketing-campaign-submit-search" variant="primary" type="submit" @click="searchCampaigns">
          Pesquisar
        </DsButton>
        <DsButton variant="secondary" type="button" @click="resetFilters">Limpar</DsButton>
        <DsButton id="marketing-campaign-new" variant="secondary" type="button" @click="openDraft">
          Gerar Nova Campanha
        </DsButton>
      </div>
    </form>

    <section v-if="draftOpen" class="marketing-campaign-draft" aria-label="Rascunho de campanha SMS">
      <div class="marketing-campaign-draft__header">
        <h2>Nova campanha segura</h2>
        <DsButton variant="secondary" size="sm" @click="resetDraft">Limpar rascunho</DsButton>
      </div>
      <div class="marketing-campaign-draft__grid">
        <DsInput
          id="marketing-campaign-description"
          v-model="draft.description"
          label="Descrição"
          placeholder="Ex: Retorno vacinal"
        />
        <DsInput
          id="marketing-campaign-title"
          v-model="draft.title"
          label="Título"
          placeholder="Ex: Vacina em dia"
        />
        <DsInput id="marketing-campaign-audience" v-model="draft.audience" label="Público" type="select">
          <option value="Clientes com SMS habilitado">Clientes com SMS habilitado</option>
          <option value="Clientes ativos">Clientes ativos</option>
          <option value="Aniversariantes do mês">Aniversariantes do mês</option>
          <option value="Agenda preventiva">Agenda preventiva</option>
        </DsInput>
        <DsInput
          id="marketing-campaign-audience-size"
          v-model="draft.audienceSize"
          label="Celulares"
          type="number"
          min="0"
          step="1"
        />
        <DsInput
          id="marketing-campaign-body"
          v-model="draft.body"
          class="marketing-campaign-draft__body"
          label="Mensagem"
          placeholder="Digite uma mensagem com até 150 caracteres"
          type="textarea"
          :maxlength="SMS_LIMIT"
          :rows="5"
          :hint="`${remainingCharacters} caracteres restantes`"
        />
      </div>
      <div class="marketing-campaign-draft__actions">
        <DsButton
          id="marketing-campaign-preview"
          variant="primary"
          type="button"
          :disabled="!canPrepareDraft"
          @click="prepareCampaignDraft"
        >
          Preparar Campanha
        </DsButton>
        <DsButton id="marketing-campaign-send" variant="primary" disabled>Enviar Campanha</DsButton>
      </div>
    </section>

    <section v-if="preparedCampaign" class="marketing-campaign-preview" aria-label="Prévia de campanha SMS">
      <h2>Prévia da campanha</h2>
      <dl>
        <div>
          <dt>Descrição</dt>
          <dd>{{ preparedCampaign.description }}</dd>
        </div>
        <div>
          <dt>Título</dt>
          <dd>{{ preparedCampaign.title }}</dd>
        </div>
        <div>
          <dt>Público</dt>
          <dd>{{ preparedCampaign.audience }}</dd>
        </div>
        <div>
          <dt>Celulares</dt>
          <dd>{{ preparedCampaign.cellphones }} celulares estimados</dd>
        </div>
        <div>
          <dt>Mensagem</dt>
          <dd>{{ preparedCampaign.body }}</dd>
        </div>
      </dl>
    </section>

    <section class="marketing-campaigns-history" aria-label="Histórico de campanhas SMS">
      <h2>Campanhas de SMS Marketing</h2>
      <div class="marketing-campaigns-table-wrapper">
        <table class="marketing-campaigns-table">
          <caption class="sr-only">
            Campanhas de SMS Marketing
          </caption>
          <thead>
            <tr>
              <th v-for="column in campaignColumns" :key="column.key" scope="col">{{ column.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="visibleCampaignRows.length === 0">
              <td :colspan="campaignColumns.length" class="marketing-campaigns-table__empty">
                Nenhuma campanha encontrada
              </td>
            </tr>
            <tr v-for="campaign in visibleCampaignRows" v-else :key="campaign.id">
              <td>{{ campaign.description }}</td>
              <td>{{ campaign.title }}</td>
              <td>{{ campaign.date }}</td>
              <td>{{ campaign.cellphones }}</td>
              <td><DsButton variant="secondary" size="sm" disabled>{{ campaign.open }}</DsButton></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="marketing-campaigns-signals" aria-label="Sinais internos de notificações">
      <h2>Sinais internos de fila</h2>
      <DataTable
        :columns="notificationColumns"
        :rows="notificationRows"
        :loading="loading"
        empty-icon="🔔"
        empty-title="Nenhuma notificação interna encontrada"
        empty-description="Leitura auxiliar da fila interna; não representa campanha SMS enviada."
        caption="Sinais internos de notificações"
        row-key-field="id"
        compact
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { notificationService } from '@/services/notifications';
import type { NotificationJobSummary, NotificationSummary } from '@cvg-his-v2/shared-types';

const SMS_LIMIT = 150;

interface CampaignRow extends DataTableRow {
  id: string;
  description: string;
  title: string;
  date: string;
  cellphones: number;
  open: string;
}

interface PreparedCampaign {
  description: string;
  title: string;
  audience: string;
  cellphones: number;
  body: string;
}

const campaignColumns: DataTableColumn[] = [
  { key: 'description', label: 'Descrição' },
  { key: 'title', label: 'Título' },
  { key: 'date', label: 'Data' },
  { key: 'cellphones', label: 'Celulares' },
  { key: 'open', label: 'Abrir' }
];

const notificationColumns: DataTableColumn[] = [
  { key: 'title', label: 'Título' },
  { key: 'category', label: 'Categoria' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Criada em' }
];

const notificationItems = ref<NotificationSummary[]>([]);
const jobItems = ref<NotificationJobSummary[]>([]);
const campaignRows = ref<CampaignRow[]>([]);
const loading = ref(false);
const error = ref('');
const draftMessage = ref('');
const draftOpen = ref(false);
const preparedCampaign = ref<PreparedCampaign | null>(null);
const descriptionSearch = ref('');

const defaultRange = currentMonthRange();
const dateFrom = ref(defaultRange.from);
const dateTo = ref(defaultRange.to);

const draft = reactive({
  description: '',
  title: '',
  audience: 'Clientes com SMS habilitado',
  audienceSize: '0',
  body: ''
});

const queuedJobs = computed(() => jobItems.value.filter((job) => job.status === 'queued'));
const remainingCharacters = computed(() => SMS_LIMIT - draft.body.length);
const canPrepareDraft = computed(() => {
  const cellphones = Number(draft.audienceSize);
  return Boolean(draft.description.trim() && draft.title.trim() && draft.body.trim() && Number.isFinite(cellphones) && cellphones >= 0);
});
const visibleCampaignRows = computed(() => {
  const search = normalize(descriptionSearch.value);
  const fromTime = dateFrom.value ? new Date(`${dateFrom.value}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = dateTo.value ? new Date(`${dateTo.value}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

  return campaignRows.value.filter((campaign) => {
    const campaignTime = new Date(`${campaign.date}T12:00:00`).getTime();
    const matchesSearch =
      !search || normalize(campaign.description).includes(search) || normalize(campaign.title).includes(search);
    return matchesSearch && campaignTime >= fromTime && campaignTime <= toTime;
  });
});
const notificationRows = computed<DataTableRow[]>(() =>
  notificationItems.value.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    status: statusLabel(item.status),
    createdAt: formatDate(item.createdAt)
  }))
);

watch(
  () => draft.body,
  (value) => {
    if (value.length > SMS_LIMIT) {
      draft.body = value.slice(0, SMS_LIMIT);
    }
  }
);

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    const [notifications, jobs] = await Promise.all([
      notificationService.list(),
      notificationService.listJobs()
    ]);
    notificationItems.value = notifications;
    jobItems.value = jobs;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar campanhas de SMS Marketing';
    notificationItems.value = [];
    jobItems.value = [];
  } finally {
    loading.value = false;
  }
}

function searchCampaigns() {
  void reload();
}

function resetFilters() {
  const range = currentMonthRange();
  descriptionSearch.value = '';
  dateFrom.value = range.from;
  dateTo.value = range.to;
  void reload();
}

function openDraft() {
  draftOpen.value = true;
  draftMessage.value = '';
}

function prepareCampaignDraft() {
  if (!canPrepareDraft.value) return;
  preparedCampaign.value = {
    description: draft.description.trim(),
    title: draft.title.trim(),
    audience: draft.audience,
    cellphones: Math.max(0, Math.trunc(Number(draft.audienceSize))),
    body: draft.body.trim()
  };
  draftMessage.value = 'Campanha preparada sem envio real';
}

function resetDraft() {
  draft.description = '';
  draft.title = '';
  draft.audience = 'Clientes com SMS habilitado';
  draft.audienceSize = '0';
  draft.body = '';
  preparedCampaign.value = null;
  draftMessage.value = '';
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to)
  };
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function statusLabel(status: NotificationSummary['status']): string {
  const map: Record<NotificationSummary['status'], string> = {
    queued: 'Pendente',
    sent: 'Enviada',
    read: 'Lida'
  };
  return map[status];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

onMounted(() => {
  void reload();
});
</script>

<style scoped>
.marketing-campaigns-page {
  display: grid;
  gap: 16px;
}

.marketing-campaigns-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.marketing-campaigns-search {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(220px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr) auto;
}

.marketing-campaigns-search__actions,
.marketing-campaign-draft__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.marketing-campaign-draft,
.marketing-campaign-preview,
.marketing-campaigns-history,
.marketing-campaigns-signals {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.marketing-campaign-draft__header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.marketing-campaign-draft__header h2,
.marketing-campaign-preview h2,
.marketing-campaigns-history h2,
.marketing-campaigns-signals h2 {
  font-size: 18px;
  line-height: 1.3;
  margin: 0;
}

.marketing-campaign-draft__grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.marketing-campaign-draft__body {
  grid-column: 1 / -1;
}

.marketing-campaign-preview dl {
  display: grid;
  gap: 10px;
  margin: 0;
}

.marketing-campaign-preview dl > div {
  display: grid;
  gap: 4px;
}

.marketing-campaign-preview dt {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.marketing-campaign-preview dd {
  margin: 0;
}

.marketing-campaigns-table-wrapper {
  overflow-x: auto;
}

.marketing-campaigns-table {
  border-collapse: collapse;
  min-width: 640px;
  width: 100%;
}

.marketing-campaigns-table th,
.marketing-campaigns-table td {
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  padding: 10px 12px;
  text-align: left;
  vertical-align: middle;
}

.marketing-campaigns-table th {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.marketing-campaigns-table__empty {
  color: var(--color-text-muted, #64748b);
  text-align: center;
}

@media (max-width: 900px) {
  .marketing-campaigns-summary-grid,
  .marketing-campaigns-search,
  .marketing-campaign-draft__grid {
    grid-template-columns: 1fr;
  }
}
</style>
