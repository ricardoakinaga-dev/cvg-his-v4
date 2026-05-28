<template>
  <div class="queue-page">
    <AppPageHeader
      title="Esteira de Atendimento"
      subtitle="Atendimento > Atendimentos > Esteira. Fila viva por setor, responsável, paciente, urgência e comanda."
      :breadcrumb-items="headerBreadcrumbItems"
      :context-items="headerContextItems"
      :next-steps="headerNextSteps"
      :primary-action="headerPrimaryAction"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section
      v-if="showReceptionCheckInContext"
      class="prepared-checkin"
      aria-label="Contexto de check-in preparado pela recepcao"
    >
      <div class="prepared-checkin__body">
        <span class="prepared-checkin__eyebrow">Recepção</span>
        <h2>Check-in preparado pela recepção</h2>
        <p v-if="preparedPatient">
          {{ preparedPatient.name }} · Tutor {{ preparedOwnerLabel }}
        </p>
        <p v-else>
          Paciente informado pela recepção não foi localizado na lista carregada. Faça o check-in manual.
        </p>
      </div>
      <DsButton variant="primary" @click="startPreparedReceptionCheckIn">
        Iniciar check-in
      </DsButton>
    </section>

    <div v-if="loading" class="page-loading">
      <DsSpinner size="md" />
    </div>

    <form v-else class="queue-filters" @submit.prevent="applyFilters">
      <div class="queue-filters__field">
        <label for="queue-sector">Setor Atual</label>
        <select id="queue-sector" v-model="draftFilters.sector">
          <option value="">Todas</option>
          <option v-for="sector in sectorOptions" :key="sector" :value="sector">
            {{ sector }}
          </option>
        </select>
      </div>
      <div class="queue-filters__field">
        <label for="queue-responsible">Profissional Responsável</label>
        <input
          id="queue-responsible"
          v-model="draftFilters.responsible"
          type="search"
          placeholder="Nome ou equipe"
        />
      </div>
      <div class="queue-filters__field">
        <label for="queue-client">Cliente</label>
        <input id="queue-client" v-model="draftFilters.client" type="search" placeholder="Tutor" />
      </div>
      <div class="queue-filters__field">
        <label for="queue-animal">ID Animal</label>
        <input
          id="queue-animal"
          v-model="draftFilters.patientId"
          type="search"
          placeholder="ID ou parte do ID"
        />
      </div>
      <label class="queue-filters__check">
        <input v-model="draftFilters.includeTerminal" type="checkbox" />
        <span>Todas</span>
      </label>
      <DsButton variant="primary" type="submit">Pesquisar</DsButton>
    </form>

    <EmptyState
      v-if="!loading && filteredRows.length === 0"
      icon="🏥"
      title="Nenhuma comanda nesta esteira"
      description="Nenhum paciente encontrado para os filtros atuais. Use Todas para incluir finalizados e cancelados ou faça um check-in rápido."
    >
      <template #action>
        <div class="queue-page__empty-actions">
          <DsButton variant="secondary" tag="a" href="/appointments">📅 Ver Agenda</DsButton>
          <DsButton variant="success" @click="openCheckInModal">Check-in Rápido</DsButton>
        </div>
      </template>
    </EmptyState>

    <div v-else-if="!loading" class="table-wrapper table-wrapper--wide">
      <table class="data-table">
        <caption class="sr-only">
          Esteira operacional de pacientes
        </caption>
        <thead>
          <tr>
            <th>Situação operacional</th>
            <th>Recebido em</th>
            <th>Origem</th>
            <th>Cliente</th>
            <th>Animal</th>
            <th>Responsável atual</th>
            <th>Próximo passo</th>
            <th>Prioridade</th>
            <th>Cobrança</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filteredRows"
            :key="row.entry.id"
            class="queue-row"
            :class="`queue-row--${row.tone}`"
          >
            <td>
              <div class="queue-operation">
                <div class="queue-operation__badges">
                  <DsBadge :variant="queueStatusVariant(row.entry.status)" size="sm">
                    {{ queueStatusLabel(row.entry.status) }}
                  </DsBadge>
                  <DsBadge v-if="row.intent !== 'Padrão'" variant="info" size="sm">
                    {{ row.intent }}
                  </DsBadge>
                </div>
                <strong>{{ row.sector }}</strong>
                <span>Destino provável: {{ row.nextSector }}</span>
              </div>
            </td>
            <td>
              <div class="queue-time">
                <span>{{ formatTime(row.entry.checkedInAt) }}</span>
                <small :class="`queue-time__wait queue-time__wait--${row.waitTone}`">
                  {{ row.waitLabel }}
                </small>
              </div>
            </td>
            <td>{{ row.sentBy }}</td>
            <td>
              <span v-if="ownerNameCache[row.entry.ownerId]">{{ ownerNameCache[row.entry.ownerId] }}</span>
              <DsSpinner v-else size="sm" inline />
            </td>
            <td>
              <div class="queue-patient">
                <strong v-if="patientNameCache[row.entry.patientId]">{{
                  patientNameCache[row.entry.patientId]
                }}</strong>
                <DsSpinner v-else size="sm" inline />
                <span>{{ row.entry.patientId }}</span>
              </div>
            </td>
            <td>
              <div class="queue-responsible">
                <strong>{{ row.responsible }}</strong>
                <span>{{ row.responsibilityHint }}</span>
              </div>
            </td>
            <td>
              <div class="queue-next-step">
                <strong>{{ row.nextStep }}</strong>
                <a
                  v-if="row.entry.encounterId"
                  class="queue-link"
                  :href="`/encounters/${row.entry.encounterId}`"
                >
                  Abrir atendimento
                </a>
                <span v-else>{{ row.nextStepHint }}</span>
              </div>
            </td>
            <td>
              <DsBadge :variant="priorityVariant(row.entry.priority)" size="sm">
                {{ priorityLabel(row.entry.priority) }}
              </DsBadge>
            </td>
            <td>
              <a
                v-if="row.entry.encounterId"
                class="queue-link"
                :href="`/billing/${row.entry.encounterId}`"
              >
                Cobrança
              </a>
              <a class="queue-link" :href="queueCounterSalePath(row.entry)">Comanda</a>
            </td>
            <td class="table__actions-col">
              <div class="actions-group">
                <DsButton
                  v-if="row.entry.status === 'waiting'"
                  variant="primary"
                  size="sm"
                  :loading="callingId === row.entry.id"
                  :disabled="callingId === row.entry.id"
                  @click="handleCall(row.entry.id)"
                >
                  {{ callingId === row.entry.id ? 'Chamando...' : 'Chamar' }}
                </DsButton>
                <DsButton
                  v-if="canHandleEncounter(row.entry)"
                  variant="success"
                  size="sm"
                  :loading="startingCareId === row.entry.id"
                  :disabled="startingCareId === row.entry.id"
                  @click="handleEncounterFlow(row.entry)"
                >
                  {{
                    startingCareId === row.entry.id ? 'Processando...' : encounterActionLabel(row.entry)
                  }}
                </DsButton>
                <DsButton
                  v-if="row.entry.encounterId"
                  tag="a"
                  :href="`/medical-records/${row.entry.encounterId}`"
                  variant="secondary"
                  size="sm"
                >
                  Prontuário
                </DsButton>
                <DsButton
                  v-if="canCompleteEntry(row.entry)"
                  variant="primary"
                  size="sm"
                  :loading="completingId === row.entry.id"
                  :disabled="completingId === row.entry.id"
                  @click="handleComplete(row.entry.id)"
                >
                  {{ completingId === row.entry.id ? 'Concluindo...' : 'Concluir' }}
                </DsButton>
                <DsButton
                  v-if="canNoShow(row.entry.status)"
                  variant="danger"
                  size="sm"
                  :loading="noShowId === row.entry.id"
                  :disabled="noShowId === row.entry.id"
                  @click="openNoShowConfirm(row.entry.id)"
                >
                  {{ noShowId === row.entry.id ? 'Registrando...' : 'No-Show' }}
                </DsButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Check-in Modal -->
    <DsModal :open="showCheckInModal" title="Check-in Rápido" size="sm" @close="closeCheckInModal">
      <div class="checkin-form">
        <div class="form-field">
          <label class="ds-input__label">Paciente *</label>
          <SearchSelect
            v-model="checkinForm.patientId"
            :options="patientOptions"
            placeholder="Buscar paciente..."
          />
          <p class="ds-input__hint">Selecione o paciente para check-in</p>
        </div>
        <DsInput
          id="checkin-priority"
          v-model="checkinForm.priority"
          type="select"
          label="Prioridade"
        >
          <option value="low">Baixa</option>
          <option value="medium" selected>Média</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </DsInput>
        <DsInput
          id="checkin-reason"
          v-model="checkinForm.reason"
          type="textarea"
          label="Motivo *"
          placeholder="Descreva o motivo do check-in"
          :rows="3"
          required
        />
      </div>
      <template #footer>
        <DsButton variant="ghost" @click="closeCheckInModal">Cancelar</DsButton>
        <DsButton
          variant="success"
          :loading="checkinSubmitting"
          :disabled="!canSubmitCheckIn"
          @click="submitCheckIn"
        >
          {{ checkinSubmitting ? 'Realizando...' : 'Confirmar Check-in' }}
        </DsButton>
      </template>
    </DsModal>

    <!-- No-Show Confirmation Modal -->
    <DsModal
      :open="showNoShowConfirm"
      title="Confirmar No-Show"
      size="sm"
      @close="closeNoShowConfirm"
    >
      <p class="noshow-confirm-text">
        Tem certeza que deseja marcar este paciente como <strong>não compareceu</strong>? Esta ação
        transicionará a entrada da fila para <strong>cancelado</strong>.
      </p>
      <template #footer>
        <DsButton variant="ghost" @click="closeNoShowConfirm">Cancelar</DsButton>
        <DsButton variant="danger" :loading="noShowSubmitting" @click="confirmNoShow">
          {{ noShowSubmitting ? 'Registrando...' : 'Confirmar No-Show' }}
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  listQueue,
  callQueueEntry,
  completeQueueEntry,
  noShowQueueEntry,
  checkInQueue
} from '@/services/scheduling';
import { encounterService } from '@/services/encounter';
import type {
  QueueEntrySummary,
  QueueStatus,
  QueuePriority,
  CheckInQueueRequest
} from '@/types/scheduling';
import { QUEUE_STATUS_LABELS, QUEUE_PRIORITY_LABELS } from '@/types/scheduling';
import { useEntityCache } from '@/composables/useEntityCache';
import { patientService } from '@/services/patient';
import type { PatientSummary } from '@/types/patient';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import EmptyState from '@/components/EmptyState.vue';
import SearchSelect from '@/components/SearchSelect.vue';
import type { SearchSelectOption } from '@/components/SearchSelect.vue';
import AppPageHeader, {
  type PageAction,
  type PageBreadcrumb,
  type PageContextItem,
  type PageNextStep
} from '@/components/AppPageHeader.vue';

const router = useRouter();
const entries = ref<QueueEntrySummary[]>([]);
const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const callingId = ref<string | null>(null);
const startingCareId = ref<string | null>(null);
const completingId = ref<string | null>(null);
const noShowId = ref<string | null>(null);
const entityCache = useEntityCache();

const lastRefresh = ref<Date | null>(null);
const isRefreshing = ref(false);
const isVisible = ref(true); // document visibility
const consecutiveErrors = ref(0);
const baseInterval = 30000; // 30s
const maxInterval = 300000; // 5min
const currentInterval = ref(baseInterval);
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);

const patientNameCache = ref<Record<string, string>>({});
const ownerNameCache = ref<Record<string, string>>({});

interface ReceptionCheckInContext {
  patientId: string;
  ownerId: string;
  reason: string;
}

interface QueueFilters {
  sector: string;
  responsible: string;
  client: string;
  patientId: string;
  includeTerminal: boolean;
}

interface EsteiraRow {
  entry: QueueEntrySummary;
  sector: string;
  sentBy: string;
  responsible: string;
  responsibilityHint: string;
  nextSector: string;
  nextStep: string;
  nextStepHint: string;
  waitLabel: string;
  waitTone: 'normal' | 'warning' | 'danger';
  tone: 'normal' | 'waiting' | 'active' | 'danger' | 'terminal';
  intent: string;
}

const VETUS_SECTORS = [
  'Não Definido',
  'ADMINISTRAÇÃO',
  'BANHO E TOSA',
  'CIRURGIA',
  'CLINICA',
  'DIAGNOSTICO POR IMAGEM',
  'ESPECIALISTAS',
  'Estoque geral',
  'Farmacia',
  'INTERNAÇÃO',
  'LABORATÓRIO',
  'MANUTENÇÃO (LIMPEZA/COPA)',
  'RECEPÇÃO'
];

const emptyFilters = (): QueueFilters => ({
  sector: '',
  responsible: '',
  client: '',
  patientId: '',
  includeTerminal: true
});

const draftFilters = ref<QueueFilters>(emptyFilters());
const appliedFilters = ref<QueueFilters>(emptyFilters());
const receptionCheckInContext = ref<ReceptionCheckInContext | null>(readReceptionCheckInQuery());
const receptionCheckInConsumed = ref(false);

const PRIORITY_ORDER: Record<QueuePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
  });
});

const esteiraRows = computed<EsteiraRow[]>(() =>
  sortedEntries.value.map((entry) => ({
    entry,
    sector: sectorForEntry(entry),
    sentBy: sentByForEntry(entry),
    responsible: responsibleForEntry(entry),
    responsibilityHint: responsibilityHintForEntry(entry),
    nextSector: nextSectorForEntry(entry),
    nextStep: nextStepForEntry(entry),
    nextStepHint: nextStepHintForEntry(entry),
    waitLabel: waitTime(entry.checkedInAt),
    waitTone: waitToneForEntry(entry),
    tone: rowToneForEntry(entry),
    intent: intentForEntry(entry)
  }))
);

const sectorOptions = computed(() => {
  const used = esteiraRows.value.map((row) => row.sector);
  return [...new Set([...VETUS_SECTORS, ...used])];
});

const filteredRows = computed(() => {
  const filters = appliedFilters.value;
  const responsibleQuery = normalizeSearch(filters.responsible);
  const clientQuery = normalizeSearch(filters.client);
  const patientQuery = normalizeSearch(filters.patientId);

  return esteiraRows.value.filter((row) => {
    if (!filters.includeTerminal && ['completed', 'cancelled'].includes(row.entry.status)) {
      return false;
    }

    if (filters.sector && row.sector !== filters.sector) {
      return false;
    }

    if (responsibleQuery && !normalizeSearch(row.responsible).includes(responsibleQuery)) {
      return false;
    }

    const ownerName = ownerNameCache.value[row.entry.ownerId] ?? '';
    if (clientQuery && !normalizeSearch(ownerName).includes(clientQuery)) {
      return false;
    }

    const patientName = patientNameCache.value[row.entry.patientId] ?? '';
    const patientHaystack = normalizeSearch(`${row.entry.patientId} ${patientName}`);
    if (patientQuery && !patientHaystack.includes(patientQuery)) {
      return false;
    }

    return true;
  });
});

const activeEntries = computed(() =>
  entries.value.filter((entry) => !['completed', 'cancelled'].includes(entry.status))
);

const criticalActiveCount = computed(
  () => activeEntries.value.filter((entry) => entry.priority === 'critical').length
);

const waitingCount = computed(
  () => activeEntries.value.filter((entry) => entry.status === 'waiting').length
);

const inCareCount = computed(
  () => activeEntries.value.filter((entry) => ['in_triage', 'in_care'].includes(entry.status)).length
);

const nextActionableEntry = computed(
  () => sortedEntries.value.find((entry) => canHandleEncounter(entry) || entry.status === 'waiting') ?? null
);

const preparedPatient = computed(() => {
  const context = receptionCheckInContext.value;
  if (!context) return null;
  return patients.value.find((patient) => patient.id === context.patientId) ?? null;
});

const preparedOwnerLabel = computed(() => {
  const context = receptionCheckInContext.value;
  const ownerId = preparedPatient.value?.primaryOwnerId || context?.ownerId;
  if (!ownerId) return 'não informado';
  return ownerNameCache.value[ownerId] || `ID ${ownerId}`;
});

const showReceptionCheckInContext = computed(
  () => Boolean(receptionCheckInContext.value) && !receptionCheckInConsumed.value
);

const headerBreadcrumbItems = computed<PageBreadcrumb[]>(() => [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'attendance', label: 'Atendimento' },
  { key: 'attendances', label: 'Atendimentos' },
  { key: 'queue', label: 'Esteira', current: true }
]);

const headerContextItems = computed<PageContextItem[]>(() => [
  {
    key: 'active',
    label: 'Ativos',
    value: String(activeEntries.value.length),
    tone: activeEntries.value.length > 0 ? 'info' : 'neutral'
  },
  {
    key: 'waiting',
    label: 'Aguardando',
    value: String(waitingCount.value),
    tone: waitingCount.value > 0 ? 'warning' : 'neutral'
  },
  {
    key: 'critical',
    label: 'Críticos',
    value: String(criticalActiveCount.value),
    tone: criticalActiveCount.value > 0 ? 'danger' : 'neutral'
  },
  {
    key: 'care',
    label: 'Clínica',
    value: String(inCareCount.value),
    tone: inCareCount.value > 0 ? 'success' : 'neutral'
  },
  {
    key: 'refresh',
    label: 'Atualizado',
    value: lastRefresh.value ? formatTime(lastRefresh.value.toISOString()) : 'Aguardando'
  }
]);

const headerNextSteps = computed<PageNextStep[]>(() => {
  const entry = nextActionableEntry.value;
  if (!entry) {
    return [
      {
        key: 'triage',
        label: 'Aguardar nova entrada',
        description: 'Use o check-in quando o tutor chegar',
        to: '/appointments'
      }
    ];
  }

  if (entry.status === 'waiting') {
    return [
      {
        key: 'call-next',
        label: 'Chamar próximo paciente',
        description: patientNameCache.value[entry.patientId] ?? queueStatusLabel(entry.status),
        to: '/queue'
      }
    ];
  }

  return [
    {
      key: 'continue-care',
      label: encounterActionLabel(entry),
      description: patientNameCache.value[entry.patientId] ?? queueStatusLabel(entry.status),
      to: entry.encounterId ? `/encounters/${entry.encounterId}` : '/queue'
    }
  ];
});

const headerPrimaryAction = computed<PageAction>(() => ({
  key: 'quick-checkin',
  label: 'Check-in Rápido',
  onClick: openCheckInModal
}));

const headerSecondaryActions = computed<PageAction[]>(() => [
  {
    key: 'refresh',
    label: 'Atualizar',
    variant: 'secondary',
    loading: isRefreshing.value,
    onClick: () => manualRefresh()
  },
  {
    key: 'agenda',
    label: 'Ver Agenda',
    variant: 'secondary',
    to: '/appointments'
  }
]);

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function readReceptionCheckInQuery(): ReceptionCheckInContext | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const patientId = params.get('patientId')?.trim();
  if (!patientId) return null;

  return {
    patientId,
    ownerId: params.get('ownerId')?.trim() || '',
    reason: params.get('reason')?.trim() || 'Recepcao'
  };
}

function queueCounterSalePath(entry: QueueEntrySummary): string {
  const params = new URLSearchParams();
  if (entry.encounterId) params.set('encounterId', entry.encounterId);
  params.set('patientId', entry.patientId);
  params.set('ownerId', entry.ownerId);
  return `/counter-sales?${params.toString()}`;
}

function applyFilters() {
  appliedFilters.value = { ...draftFilters.value };
}

function sectorForEntry(entry: QueueEntrySummary): string {
  const map: Record<QueueStatus, string> = {
    waiting: 'RECEPÇÃO',
    called: 'RECEPÇÃO',
    in_triage: 'CLINICA',
    in_care: 'CLINICA',
    observation: 'INTERNAÇÃO',
    completed: 'Não Definido',
    cancelled: 'Não Definido'
  };
  return map[entry.status] ?? 'Não Definido';
}

function sentByForEntry(entry: QueueEntrySummary): string {
  const map: Record<QueueStatus, string> = {
    waiting: 'Recepção',
    called: 'Recepção',
    in_triage: 'Recepção',
    in_care: 'Triagem',
    observation: 'Clínica',
    completed: 'Clínica',
    cancelled: 'Recepção'
  };
  return map[entry.status] ?? 'Recepção';
}

function responsibleForEntry(entry: QueueEntrySummary): string {
  const map: Record<QueueStatus, string> = {
    waiting: 'Recepção',
    called: 'Equipe de triagem',
    in_triage: 'Equipe de triagem',
    in_care: 'Equipe clínica',
    observation: 'Equipe de internação',
    completed: 'Recepção / financeiro',
    cancelled: 'Recepção'
  };
  return map[entry.status] ?? '—';
}

function responsibilityHintForEntry(entry: QueueEntrySummary): string {
  const map: Record<QueueStatus, string> = {
    waiting: 'Deve chamar ou priorizar',
    called: 'Paciente chamado; abrir triagem',
    in_triage: 'Triagem assumida',
    in_care: 'Atendimento em curso',
    observation: 'Acompanhar observação',
    completed: 'Validar fechamento',
    cancelled: 'Sem ação clínica ativa'
  };
  return map[entry.status] ?? 'Responsável derivado do status';
}

function nextSectorForEntry(entry: QueueEntrySummary): string {
  const map: Record<QueueStatus, string> = {
    waiting: 'Triagem',
    called: 'Triagem',
    in_triage: 'Clínica',
    in_care: 'Recepção / financeiro',
    observation: 'Internação ou recepção',
    completed: 'Fechamento',
    cancelled: 'Arquivo operacional'
  };
  return map[entry.status] ?? 'A definir';
}

function nextStepForEntry(entry: QueueEntrySummary): string {
  const map: Record<QueueStatus, string> = {
    waiting: entry.priority === 'critical' ? 'Chamar imediatamente' : 'Chamar paciente',
    called: 'Abrir triagem',
    in_triage: 'Entrar em atendimento',
    in_care: 'Continuar atendimento',
    observation: 'Reavaliar ou encaminhar',
    completed: 'Conferir cobrança',
    cancelled: 'Revisar cancelamento'
  };
  return map[entry.status] ?? 'Definir próximo passo';
}

function nextStepHintForEntry(entry: QueueEntrySummary): string {
  if (entry.encounterId) return 'Atendimento vinculado';
  if (entry.status === 'waiting') return 'Ainda sem atendimento ativo';
  if (entry.status === 'called') return 'Encounter será criado ao abrir triagem';
  if (entry.status === 'cancelled') return 'Fluxo encerrado';
  return 'Sem Encounter vinculado';
}

function waitToneForEntry(entry: QueueEntrySummary): 'normal' | 'warning' | 'danger' {
  if (entry.status === 'completed' || entry.status === 'cancelled') return 'normal';
  if (entry.priority === 'critical') return 'danger';

  const minutes = waitMinutes(entry.checkedInAt);
  if (minutes >= 90) return 'danger';
  if (minutes >= 30) return 'warning';
  return 'normal';
}

function rowToneForEntry(entry: QueueEntrySummary): EsteiraRow['tone'] {
  if (entry.status === 'completed' || entry.status === 'cancelled') return 'terminal';
  if (entry.priority === 'critical') return 'danger';
  if (entry.status === 'waiting' || entry.status === 'called') return 'waiting';
  if (entry.status === 'in_triage' || entry.status === 'in_care' || entry.status === 'observation') {
    return 'active';
  }
  return 'normal';
}

function intentForEntry(entry: QueueEntrySummary): string {
  const reason = normalizeSearch(entry.reason);
  if (entry.status === 'completed') return 'Finalização';
  if (entry.status === 'cancelled') return 'Cancelado';
  if (entry.priority === 'critical') return 'Crítico';
  if (reason.includes('retorno')) return 'Retorno';
  if (entry.appointmentId) return 'Agendado';
  return 'Padrão';
}

function queueStatusLabel(status: QueueStatus): string {
  return QUEUE_STATUS_LABELS[status] || status;
}

function queueStatusVariant(
  status: QueueStatus
): 'info' | 'warning' | 'success' | 'danger' | 'default' {
  const map: Record<QueueStatus, 'info' | 'warning' | 'success' | 'danger' | 'default'> = {
    waiting: 'info',
    called: 'warning',
    in_triage: 'warning',
    in_care: 'success',
    observation: 'info',
    completed: 'default',
    cancelled: 'danger'
  };
  return map[status] || 'default';
}

function priorityLabel(priority: QueuePriority): string {
  return QUEUE_PRIORITY_LABELS[priority] || priority;
}

function priorityVariant(priority: QueuePriority): 'danger' | 'warning' | 'info' | 'default' {
  const map: Record<QueuePriority, 'danger' | 'warning' | 'info' | 'default'> = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'default'
  };
  return map[priority] || 'default';
}

function waitTime(checkedInAt: string): string {
  const minutes = waitMinutes(checkedInAt);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h${remaining}min`;
}

function waitMinutes(checkedInAt: string): number {
  const diff = Date.now() - new Date(checkedInAt).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function formatTime(d: string): string {
  try {
    return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function canNoShow(status: QueueStatus): boolean {
  return ['waiting', 'called', 'in_triage', 'in_care', 'observation'].includes(status);
}

function canHandleEncounter(entry: QueueEntrySummary): boolean {
  if (entry.status === 'called') {
    return true;
  }

  if (entry.status === 'in_triage') {
    return Boolean(entry.encounterId);
  }

  if (entry.status === 'in_care' || entry.status === 'observation') {
    return Boolean(entry.encounterId);
  }

  return false;
}

function canCompleteEntry(entry: QueueEntrySummary): boolean {
  return ['in_care', 'observation'].includes(entry.status);
}

function encounterActionLabel(entry: QueueEntrySummary): string {
  if (entry.status === 'called') {
    return 'Abrir triagem';
  }

  if (entry.status === 'in_triage') {
    return 'Entrar em atendimento';
  }

  return 'Continuar atendimento';
}

async function handleCall(queueEntryId: string) {
  callingId.value = queueEntryId;
  try {
    await callQueueEntry(queueEntryId);
    await loadQueue();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao chamar paciente da fila';
  } finally {
    callingId.value = null;
  }
}

async function handleEncounterFlow(entry: QueueEntrySummary) {
  startingCareId.value = entry.id;
  try {
    if (!entry.encounterId) {
      const created = await encounterService.create({
        patientId: entry.patientId,
        ownerId: entry.ownerId,
        appointmentId: entry.appointmentId ?? undefined,
        queueEntryId: entry.id,
        visitType: entry.appointmentId ? 'scheduled' : 'walk_in',
        origin: entry.appointmentId ? 'schedule' : 'reception',
        reason: entry.reason
      });
      await encounterService.transition(created.id, { nextStatus: 'in_triage' });
      successMessage.value = 'Paciente encaminhado para triagem.';
      await loadQueue();
      await router.push(`/encounters/${created.id}`);
      return;
    }

    if (entry.status === 'in_triage') {
      await encounterService.transition(entry.encounterId, { nextStatus: 'in_care' });
      successMessage.value = 'Atendimento iniciado com sucesso.';
      await loadQueue();
      await router.push(`/encounters/${entry.encounterId}`);
      return;
    }

    await router.push(`/encounters/${entry.encounterId}`);
    return;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao conduzir fluxo de atendimento';
  } finally {
    startingCareId.value = null;
  }
}

async function handleComplete(queueEntryId: string) {
  completingId.value = queueEntryId;
  error.value = '';
  successMessage.value = '';

  try {
    await completeQueueEntry(queueEntryId);
    successMessage.value = 'Entrada da esteira concluída com sucesso.';
    await loadQueue();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao concluir entrada da esteira';
  } finally {
    completingId.value = null;
  }
}

async function handleNoShow(queueEntryId: string) {
  noShowId.value = queueEntryId;
  try {
    await noShowQueueEntry(queueEntryId);
    await loadQueue();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar no-show';
  } finally {
    noShowId.value = null;
  }
}

// No-show confirmation modal state
const showNoShowConfirm = ref(false);
const noShowSubmitting = ref(false);
const pendingNoShowId = ref<string | null>(null);

function openNoShowConfirm(queueEntryId: string) {
  pendingNoShowId.value = queueEntryId;
  showNoShowConfirm.value = true;
}

function closeNoShowConfirm() {
  showNoShowConfirm.value = false;
  pendingNoShowId.value = null;
}

async function confirmNoShow() {
  if (!pendingNoShowId.value) return;

  noShowSubmitting.value = true;
  try {
    await handleNoShow(pendingNoShowId.value);
    closeNoShowConfirm();
  } catch {
    // error already set by handleNoShow
  } finally {
    noShowSubmitting.value = false;
  }
}

function startPolling() {
  if (pollTimer.value) clearInterval(pollTimer.value);
  pollTimer.value = setInterval(() => {
    if (isVisible.value) {
      loadQueue(true); // background refresh
    }
  }, currentInterval.value);
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

function handleVisibilityChange() {
  const visible = !document.hidden;
  if (visible === isVisible.value) {
    // No actual change, ignore spurious events
    return;
  }
  isVisible.value = visible;
  if (visible) {
    // Tab became visible — restart polling with current interval and refresh immediately
    startPolling();
    loadQueue(false); // foreground refresh
  } else {
    // Tab hidden — stop polling to save resources
    stopPolling();
  }
}

function manualRefresh() {
  return loadQueue(false); // foreground refresh
}

// Check-in modal state
const showCheckInModal = ref(false);
const checkinSubmitting = ref(false);
const patients = ref<PatientSummary[]>([]);

const patientOptions = computed<SearchSelectOption[]>(() =>
  patients.value.map((p) => ({
    label: p.name,
    value: p.id
  }))
);

const checkinForm = ref({
  patientId: '',
  priority: 'medium' as QueuePriority,
  reason: ''
});

const canSubmitCheckIn = computed(() => {
  return checkinForm.value.patientId && checkinForm.value.reason.trim();
});

function openCheckInModal() {
  checkinForm.value = { patientId: '', priority: 'medium', reason: '' };
  showCheckInModal.value = true;
}

function startPreparedReceptionCheckIn() {
  const context = receptionCheckInContext.value;
  if (!context) {
    openCheckInModal();
    return;
  }

  checkinForm.value = {
    patientId: preparedPatient.value ? context.patientId : '',
    priority: 'medium',
    reason: context.reason || 'Recepcao'
  };
  receptionCheckInConsumed.value = true;
  showCheckInModal.value = true;
}

function closeCheckInModal() {
  showCheckInModal.value = false;
  checkinForm.value = { patientId: '', priority: 'medium', reason: '' };
}

async function submitCheckIn() {
  if (!canSubmitCheckIn.value) return;

  checkinSubmitting.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const patient = patients.value.find((p) => p.id === checkinForm.value.patientId);
    if (!patient) {
      error.value = 'Paciente não encontrado';
      return;
    }

    const payload: CheckInQueueRequest = {
      patientId: checkinForm.value.patientId,
      ownerId: patient.primaryOwnerId,
      priority: checkinForm.value.priority,
      reason: checkinForm.value.reason.trim()
    };

    await checkInQueue(payload);
    successMessage.value = 'Check-in realizado com sucesso!';
    closeCheckInModal();
    await loadQueue();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao realizar check-in';
  } finally {
    checkinSubmitting.value = false;
  }
}

async function loadQueue(background = false) {
  if (background && (loading.value || isRefreshing.value)) {
    return; // Skip if already loading or refreshing
  }

  if (!background) {
    loading.value = true;
  } else {
    isRefreshing.value = true;
  }
  error.value = '';
  try {
    entries.value = await listQueue();
    await Promise.allSettled(
      entries.value.map(async (entry) => {
        if (!patientNameCache.value[entry.patientId]) {
          patientNameCache.value[entry.patientId] = await entityCache.getPatientName(
            entry.patientId
          );
        }
        if (!ownerNameCache.value[entry.ownerId]) {
          ownerNameCache.value[entry.ownerId] = await entityCache.getOwnerName(entry.ownerId);
        }
      })
    );
    lastRefresh.value = new Date();
    // Reset backoff on success
    if (consecutiveErrors.value > 0) {
      consecutiveErrors.value = 0;
      currentInterval.value = baseInterval;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar fila operacional';
    // Increment backoff on background refresh error
    if (background) {
      consecutiveErrors.value++;
      // Exponential backoff capped at maxInterval
      currentInterval.value = Math.min(
        baseInterval * Math.pow(2, consecutiveErrors.value),
        maxInterval
      );
    }
  } finally {
    loading.value = false;
    isRefreshing.value = false;
  }
}

async function loadPatients() {
  try {
    patients.value = await patientService.list();
  } catch {
    // Silently fail — check-in modal will show empty list
  }
}

onMounted(() => {
  // Set initial visibility state
  isVisible.value = !document.hidden;

  // Listen for tab visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);

  Promise.all([loadQueue(), loadPatients()]).then(() => {
    if (isVisible.value) {
      startPolling();
    }
  });
});

onUnmounted(() => {
  stopPolling();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

defineExpose({
  consecutiveErrors,
  currentInterval,
  baseInterval,
  maxInterval,
  isVisible,
  startPolling,
  stopPolling,
  loadQueue,
  pollTimer,
  loading,
  isRefreshing
});
</script>

<style scoped>
.queue-page {
  max-width: 1280px;
}

.queue-filters {
  display: grid;
  grid-template-columns: minmax(180px, 1.1fr) repeat(3, minmax(150px, 1fr)) auto auto;
  gap: 12px;
  align-items: end;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.prepared-checkin {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 16px;
  border: 1px solid #99f6e4;
  border-left: 4px solid #0f766e;
  border-radius: 8px;
  background: #f0fdfa;
}

.prepared-checkin__body {
  min-width: 0;
}

.prepared-checkin__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #0f766e;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.prepared-checkin h2 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
}

.prepared-checkin p {
  margin: 4px 0 0;
  color: #475569;
  font-size: 13px;
}

.queue-filters__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-filters__field label,
.queue-filters__check {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary, #475569);
}

.queue-filters__field input,
.queue-filters__field select {
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
}

.queue-filters__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
}

.table-wrapper--wide {
  overflow-x: auto;
}

.queue-row {
  border-left: 3px solid transparent;
}

.queue-row--waiting {
  border-left-color: var(--color-warning, #f59e0b);
}

.queue-row--active {
  border-left-color: var(--color-success, #16a34a);
}

.queue-row--danger {
  border-left-color: var(--color-danger, #dc2626);
}

.queue-row--terminal {
  opacity: 0.72;
}

.queue-operation,
.queue-time,
.queue-responsible,
.queue-next-step,
.queue-sector,
.queue-patient {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 128px;
}

.queue-operation {
  min-width: 180px;
}

.queue-operation__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 2px;
}

.queue-responsible {
  min-width: 152px;
}

.queue-next-step {
  min-width: 168px;
}

.queue-sector strong,
.queue-patient strong,
.queue-operation strong,
.queue-responsible strong,
.queue-next-step strong {
  font-size: 13px;
  color: var(--color-text, #0f172a);
}

.queue-sector span,
.queue-patient span,
.queue-operation span,
.queue-responsible span,
.queue-next-step span,
td small {
  font-size: 12px;
  color: var(--color-text-secondary, #64748b);
}

.queue-time__wait {
  width: fit-content;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--color-surface-muted, #f8fafc);
  font-weight: 700;
}

.queue-time__wait--warning {
  color: var(--color-warning-text, #92400e);
  background: var(--color-warning-bg, #fffbeb);
}

.queue-time__wait--danger {
  color: var(--color-danger-text, #991b1b);
  background: var(--color-danger-bg, #fef2f2);
}

.queue-link {
  font-weight: 700;
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.queue-link:hover {
  text-decoration: underline;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.actions-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.queue-page__empty-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.checkin-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.noshow-confirm-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary, #475569);
}

@media (max-width: 1100px) {
  .queue-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .queue-filters {
    grid-template-columns: 1fr;
  }

  .prepared-checkin {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
