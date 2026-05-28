<template>
  <div class="marketing-campaigns-page">
    <AppPageHeader
      title="Campanhas de Marketing"
      :breadcrumbs="['Marketing', 'Campanhas']"
      subtitle="Planejamento auditável de campanhas com segmentos, templates e canais SMS, WhatsApp e e-mail"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/marketing/sms">SMS simples</DsButton>
        <DsButton variant="secondary" tag="a" to="/notifications/whatsapp">WhatsApp</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="success" variant="success" dismissible @dismiss="success = ''">
      {{ success }}
    </DsAlert>

    <section class="marketing-campaigns-page__kpis">
      <DsStatCard label="Campanhas" :value="campaigns.length" icon="📣" />
      <DsStatCard label="Agendadas" :value="scheduledCampaigns" icon="⏱️" />
      <DsStatCard label="Segmentos" :value="segments.length" icon="🎯" />
      <DsStatCard label="Templates" :value="templates.length" icon="📝" />
    </section>

    <section class="marketing-campaigns-page__split">
      <DsCard title="Nova campanha">
        <div class="marketing-campaigns-page__form-grid">
          <DsInput id="campaign-name" v-model="campaignForm.name" label="Nome da campanha" />
          <DsInput id="campaign-channel" v-model="campaignForm.channel" type="select" label="Canal">
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </DsInput>
          <DsInput id="campaign-segment" v-model="campaignForm.segmentId" type="select" label="Segmento">
            <option value="">Selecione</option>
            <option v-for="segment in segments" :key="segment.id" :value="segment.id">{{ segment.name }}</option>
          </DsInput>
          <DsInput id="campaign-template" v-model="campaignForm.templateId" type="select" label="Template">
            <option value="">Selecione</option>
            <option v-for="template in filteredTemplates" :key="template.id" :value="template.id">{{ template.name }}</option>
          </DsInput>
          <DsInput id="campaign-scheduled-at" v-model="campaignForm.scheduledAt" type="datetime-local" label="Agendamento" />
        </div>
        <div class="marketing-campaigns-page__actions">
          <DsButton
            variant="primary"
            :loading="creatingCampaign"
            :disabled="!canCreateCampaign"
            @click="createCampaign"
          >
            Criar campanha
          </DsButton>
        </div>
      </DsCard>

      <DsCard title="Segmento rápido">
        <div class="marketing-campaigns-page__form-grid marketing-campaigns-page__form-grid--compact">
          <DsInput id="segment-name" v-model="segmentForm.name" label="Nome" />
          <DsInput id="segment-owner-groups" v-model="segmentForm.ownerGroups" label="Grupos de tutores" placeholder="VIP, Recorrente" />
          <DsInput id="segment-species" v-model="segmentForm.patientSpecies" label="Espécies" placeholder="Canina, Felina" />
          <DsInput id="segment-consent" v-model="segmentForm.consentPurpose" type="select" label="Consentimento">
            <option value="marketing">Marketing</option>
            <option value="preventive">Preventivo</option>
            <option value="transactional">Transacional</option>
          </DsInput>
        </div>
        <div class="marketing-campaigns-page__actions">
          <DsButton variant="secondary" :loading="creatingSegment" :disabled="!segmentForm.name" @click="createSegment">
            Criar segmento
          </DsButton>
        </div>
      </DsCard>
    </section>

    <DsCard title="Templates de comunicação">
      <div class="marketing-campaigns-page__template-grid">
        <DsInput id="template-name" v-model="templateForm.name" label="Nome" />
        <DsInput id="template-channel" v-model="templateForm.channel" type="select" label="Canal">
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
        </DsInput>
        <DsInput id="template-subject" v-model="templateForm.subject" label="Assunto" />
        <DsInput id="template-body" v-model="templateForm.body" label="Mensagem" />
        <DsButton variant="secondary" :loading="creatingTemplate" :disabled="!templateForm.name || !templateForm.body" @click="createTemplate">
          Criar template
        </DsButton>
      </div>
    </DsCard>

    <DsCard title="Fila de campanhas">
      <DataTable
        :columns="campaignColumns"
        :rows="campaignRows"
        :loading="loading"
        empty-icon="📣"
        empty-title="Nenhuma campanha criada"
        empty-description="Crie segmentos e templates para planejar campanhas premium."
        variant="hoverable"
      >
        <template #cell-status="{ value }">
          <StatusBadge :label="statusLabel(String(value))" :variant="statusVariant(String(value))" />
        </template>
        <template #cell-actions="{ row }">
          <DsButton
            v-if="row.rawStatus === 'draft'"
            size="sm"
            variant="secondary"
            :loading="schedulingCampaignId === row.id"
            @click="scheduleCampaign(String(row.id))"
          >
            Agendar
          </DsButton>
          <span v-else>Agendada</span>
        </template>
      </DataTable>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import {
  marketingService,
  type MarketingCampaignStatus,
  type MarketingCampaignSummary,
  type MarketingChannel,
  type MarketingConsentPurpose,
  type MarketingSegmentSummary,
  type MarketingTemplateSummary
} from '@/services/marketing';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

const loading = ref(false);
const creatingCampaign = ref(false);
const creatingSegment = ref(false);
const creatingTemplate = ref(false);
const schedulingCampaignId = ref('');
const error = ref('');
const success = ref('');
const campaigns = ref<MarketingCampaignSummary[]>([]);
const segments = ref<MarketingSegmentSummary[]>([]);
const templates = ref<MarketingTemplateSummary[]>([]);

const campaignForm = reactive({
  name: '',
  channel: 'sms' as MarketingChannel,
  segmentId: '',
  templateId: '',
  scheduledAt: toDatetimeLocal(addDays(new Date(), 1))
});

const segmentForm = reactive({
  name: '',
  ownerGroups: 'VIP',
  patientSpecies: 'Canina',
  consentPurpose: 'marketing' as MarketingConsentPurpose
});

const templateForm = reactive({
  name: '',
  channel: 'sms' as MarketingChannel,
  subject: '',
  body: 'Ola {{ownerName}}, temos novidades para {{patientName}}.'
});

const campaignColumns: DataTableColumn[] = [
  { key: 'name', label: 'Campanha' },
  { key: 'channel', label: 'Canal' },
  { key: 'segment', label: 'Segmento' },
  { key: 'template', label: 'Template' },
  { key: 'scheduledAt', label: 'Agendada para' },
  { key: 'estimatedAudience', label: 'Público' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações' }
];

const scheduledCampaigns = computed(() => campaigns.value.filter((campaign) => campaign.status === 'scheduled').length);
const filteredTemplates = computed(() => templates.value.filter((template) => template.channel === campaignForm.channel));
const canCreateCampaign = computed(() => Boolean(campaignForm.name && campaignForm.segmentId && campaignForm.templateId));

const campaignRows = computed<DataTableRow[]>(() =>
  campaigns.value.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    channel: channelLabel(campaign.channel),
    segment: segments.value.find((segment) => segment.id === campaign.segmentId)?.name ?? campaign.segmentId,
    template: templates.value.find((template) => template.id === campaign.templateId)?.name ?? campaign.templateId,
    scheduledAt: formatDateTime(campaign.scheduledAt),
    estimatedAudience: campaign.estimatedAudience,
    status: campaign.status,
    rawStatus: campaign.status
  }))
);

async function loadData(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const [nextSegments, nextTemplates, nextCampaigns] = await Promise.all([
      marketingService.listSegments(),
      marketingService.listTemplates(),
      marketingService.listCampaigns()
    ]);
    segments.value = nextSegments;
    templates.value = nextTemplates;
    campaigns.value = nextCampaigns;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar marketing.';
  } finally {
    loading.value = false;
  }
}

async function createSegment(): Promise<void> {
  creatingSegment.value = true;
  error.value = '';
  try {
    await marketingService.createSegment({
      name: segmentForm.name,
      criteria: {
        ownerGroups: parseCsv(segmentForm.ownerGroups),
        patientSpecies: parseCsv(segmentForm.patientSpecies),
        consentPurpose: segmentForm.consentPurpose
      }
    });
    segmentForm.name = '';
    success.value = 'Segmento criado.';
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível criar segmento.';
  } finally {
    creatingSegment.value = false;
  }
}

async function createTemplate(): Promise<void> {
  creatingTemplate.value = true;
  error.value = '';
  try {
    await marketingService.createTemplate({ ...templateForm });
    templateForm.name = '';
    success.value = 'Template criado.';
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível criar template.';
  } finally {
    creatingTemplate.value = false;
  }
}

async function createCampaign(): Promise<void> {
  creatingCampaign.value = true;
  error.value = '';
  try {
    await marketingService.createCampaign({
      ...campaignForm,
      scheduledAt: toIsoFromLocal(campaignForm.scheduledAt)
    });
    campaignForm.name = '';
    success.value = 'Campanha criada.';
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível criar campanha.';
  } finally {
    creatingCampaign.value = false;
  }
}

async function scheduleCampaign(campaignId: string): Promise<void> {
  schedulingCampaignId.value = campaignId;
  error.value = '';
  try {
    await marketingService.scheduleCampaign(campaignId);
    success.value = 'Campanha agendada.';
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível agendar campanha.';
  } finally {
    schedulingCampaignId.value = '';
  }
}

function parseCsv(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function channelLabel(channel: MarketingChannel): string {
  return { sms: 'SMS', whatsapp: 'WhatsApp', email: 'E-mail' }[channel];
}

function statusLabel(status: string): string {
  return {
    draft: 'Rascunho',
    scheduled: 'Agendada',
    running: 'Executando',
    sent: 'Enviada',
    cancelled: 'Cancelada'
  }[status] ?? status;
}

function statusVariant(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'scheduled') return 'info';
  if (status === 'sent') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'running') return 'warning';
  return 'neutral';
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDatetimeLocal(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function formatDateTime(value?: string): string {
  return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-';
}

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.marketing-campaigns-page {
  display: grid;
  gap: var(--ds-spacing-5);
}

.marketing-campaigns-page__kpis,
.marketing-campaigns-page__split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--ds-spacing-4);
}

.marketing-campaigns-page__form-grid,
.marketing-campaigns-page__template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: var(--ds-spacing-4);
}

.marketing-campaigns-page__form-grid--compact {
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.marketing-campaigns-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ds-spacing-3);
  margin-top: var(--ds-spacing-4);
}
</style>
