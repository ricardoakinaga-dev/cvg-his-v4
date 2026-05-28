<template>
  <div class="reception-gateway-page">
    <AppPageHeader
      title="Recepção"
      subtitle="Mesa operacional para localizar tutor ou paciente e direcionar para cadastro, Agenda ou Esteira."
      :breadcrumb-items="headerBreadcrumbs"
      :context-items="headerContextItems"
      :next-steps="headerNextSteps"
      :primary-action="headerPrimaryAction"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <form class="reception-search" role="search" @submit.prevent="runSearch">
      <DsInput
        v-model="query"
        type="search"
        label="Busca da recepção"
        placeholder="Buscar tutor ou paciente por nome, documento, telefone, e-mail, ID ou microchip"
      />
      <DsButton type="submit" variant="primary" :loading="loading">Buscar</DsButton>
      <DsButton v-if="hasQuery" type="button" variant="ghost" @click="clearSearch">Limpar</DsButton>
    </form>

    <section
      v-if="searched && contextualQuickActions.length > 0"
      class="contextual-quick-actions"
      aria-label="Acoes rapidas contextuais da recepcao"
    >
      <div class="contextual-quick-actions__head">
        <div>
          <span class="reception-funnel__eyebrow">Menos cliques</span>
          <h2>Ações rápidas contextuais</h2>
          <p>Atalhos derivados da busca atual para seguir sem redigitar tutor ou paciente.</p>
        </div>
        <RouterLink class="text-link" to="/master-search">Busca global</RouterLink>
      </div>

      <div class="contextual-quick-actions__grid">
        <RouterLink
          v-for="action in contextualQuickActions"
          :key="action.key"
          class="contextual-action"
          :class="`contextual-action--${action.tone}`"
          :to="action.to"
        >
          <span>{{ action.label }}</span>
          <strong>{{ action.title }}</strong>
          <small>{{ action.description }}</small>
        </RouterLink>
      </div>
    </section>

    <section class="reception-workflow" aria-label="Proximos passos da recepcao">
      <div class="workflow-step">
        <span class="workflow-step__number">1</span>
        <div>
          <strong>Tutor</strong>
          <p>Localizar ou cadastrar responsavel.</p>
        </div>
      </div>
      <div class="workflow-step">
        <span class="workflow-step__number">2</span>
        <div>
          <strong>Paciente</strong>
          <p>Confirmar animal ou criar vinculo.</p>
        </div>
      </div>
      <div class="workflow-step">
        <span class="workflow-step__number">3</span>
        <div>
          <strong>Agenda ou Esteira</strong>
          <p>Programar chegada ou acompanhar trabalho vivo.</p>
        </div>
      </div>
    </section>

    <section class="reception-funnel" aria-label="Funil operacional da recepcao">
      <div class="reception-funnel__head">
        <div>
          <span class="reception-funnel__eyebrow">Esteira central</span>
          <h2>Funil operacional</h2>
          <p>Entradas vivas da recepcao, atendimento em andamento e finalizacoes da esteira.</p>
        </div>
        <RouterLink class="text-link" to="/queue">Abrir Esteira</RouterLink>
      </div>

      <DsAlert v-if="queueError" variant="warning" dismissible @dismiss="queueError = ''">
        {{ queueError }}
      </DsAlert>

      <div class="funnel-metrics" aria-label="Resumo da esteira operacional">
        <article class="funnel-metric">
          <span>Aguardando recepção</span>
          <strong>{{ receptionQueueCount }}</strong>
        </article>
        <article class="funnel-metric">
          <span>Em atendimento</span>
          <strong>{{ clinicalQueueCount }}</strong>
        </article>
        <article class="funnel-metric">
          <span>Finalizados</span>
          <strong>{{ completedQueueCount }}</strong>
        </article>
        <article class="funnel-metric">
          <span>Cancelados</span>
          <strong>{{ cancelledQueueCount }}</strong>
        </article>
      </div>

      <div v-if="queueLoading" class="queue-preview queue-preview--loading">
        Carregando esteira operacional...
      </div>
      <div v-else-if="activeQueueEntries.length > 0" class="queue-preview">
        <article v-for="entry in activeQueueEntries" :key="entry.id" class="queue-preview-row">
          <div class="queue-preview-row__body">
            <span class="queue-preview-row__eyebrow">{{ queueStatusLabel(entry.status) }}</span>
            <strong>{{ entry.reason || 'Entrada sem motivo informado' }}</strong>
            <p>
              Paciente {{ entry.patientId }} · Tutor {{ entry.ownerId }} · Prioridade
              {{ queuePriorityLabel(entry.priority) }}
            </p>
          </div>
          <div class="queue-preview-row__actions">
            <RouterLink
              class="button-link button-link--secondary"
              :to="`/patients/${entry.patientId}`"
            >
              Paciente
            </RouterLink>
            <RouterLink class="button-link button-link--secondary" :to="`/owners/${entry.ownerId}`">
              Tutor
            </RouterLink>
            <RouterLink
              v-if="entry.encounterId"
              class="button-link button-link--primary"
              :to="`/encounters/${entry.encounterId}`"
            >
              Atendimento
            </RouterLink>
            <RouterLink
              class="button-link button-link--secondary"
              :to="queueCounterSalePath(entry)"
            >
              Comanda
            </RouterLink>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        icon="RC"
        title="Nenhuma entrada ativa na recepção"
        description="Use a busca, a agenda ou a esteira para iniciar uma nova entrada operacional."
        size="sm"
      />
    </section>

    <section class="handoff-preview" aria-label="Inbox minima de handoffs clinicos da recepcao">
      <div class="reception-funnel__head">
        <div>
          <span class="reception-funnel__eyebrow">Inbox minima</span>
          <h2>Handoffs da recepção</h2>
          <p>
            Recebimento operacional dos casos enviados pela clinica, sem criar cobranca ou comanda.
          </p>
        </div>
        <DsButton
          variant="secondary"
          size="sm"
          :loading="handoffLoading"
          @click="loadClinicalHandoffs"
        >
          Atualizar
        </DsButton>
      </div>

      <DsAlert v-if="handoffError" variant="warning" dismissible @dismiss="handoffError = ''">
        {{ handoffError }}
      </DsAlert>

      <div class="handoff-metrics" aria-label="Resumo da inbox minima de handoffs">
        <article class="handoff-metric">
          <span>Aguardando ACK</span>
          <strong>{{ pendingHandoffs.length }}</strong>
        </article>
        <article class="handoff-metric">
          <span>Alta ou crítica</span>
          <strong>{{ urgentPendingHandoffs }}</strong>
        </article>
        <article class="handoff-metric">
          <span>Recebidos</span>
          <strong>{{ acknowledgedHandoffs.length }}</strong>
        </article>
      </div>

      <div class="handoff-tabs" aria-label="Filtro da inbox minima">
        <button
          type="button"
          class="handoff-tab"
          :class="{ 'handoff-tab--active': handoffInboxMode === 'pending' }"
          @click="handoffInboxMode = 'pending'"
        >
          Aguardando
        </button>
        <button
          type="button"
          class="handoff-tab"
          :class="{ 'handoff-tab--active': handoffInboxMode === 'acknowledged' }"
          @click="handoffInboxMode = 'acknowledged'"
        >
          Recebidos
        </button>
      </div>

      <div v-if="handoffLoading" class="queue-preview queue-preview--loading">
        Carregando handoffs clinicos...
      </div>
      <div v-else-if="visibleClinicalHandoffs.length > 0" class="queue-preview">
        <article
          v-for="handoff in visibleClinicalHandoffs"
          :key="handoff.id"
          class="queue-preview-row"
        >
          <div class="queue-preview-row__body">
            <span class="queue-preview-row__eyebrow">
              {{ handoffStatusLabel(handoff.handoffStatus) }} ·
              {{ handoffPriorityLabel(handoff.priority) }} · {{ formatDateTime(handoff.sentAt) }}
            </span>
            <strong>{{ handoff.clinicalSummary }}</strong>
            <p>
              Paciente {{ handoff.patientId }} · Tutor {{ handoff.ownerId }} ·
              {{ handoff.receptionInstructions }}
            </p>
            <p v-if="handoff.acknowledgedAt" class="handoff-ack-note">
              Recebido em {{ formatDateTime(handoff.acknowledgedAt) }}
              <span v-if="handoff.acknowledgeNote">· {{ handoff.acknowledgeNote }}</span>
            </p>
          </div>
          <div class="queue-preview-row__actions">
            <RouterLink
              class="button-link button-link--secondary"
              :to="`/encounters/${handoff.encounterId}`"
            >
              Atendimento
            </RouterLink>
            <RouterLink
              class="button-link button-link--secondary"
              :to="`/patients/${handoff.patientId}`"
            >
              Paciente
            </RouterLink>
            <RouterLink
              class="button-link button-link--secondary"
              :to="`/owners/${handoff.ownerId}`"
            >
              Tutor
            </RouterLink>
            <DsButton
              v-if="handoff.handoffStatus === 'sent_to_reception'"
              size="sm"
              variant="primary"
              :loading="acknowledgingHandoffId === handoff.id"
              @click="acknowledgeClinicalHandoff(handoff.id)"
            >
              Confirmar recebimento
            </DsButton>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        icon="HO"
        :title="handoffEmptyTitle"
        :description="handoffEmptyDescription"
        size="sm"
      />
    </section>

    <section class="reception-primary-actions" aria-label="Acoes principais da recepcao">
      <RouterLink class="operation-link operation-link--primary" to="/owners/new">
        <strong>Cadastrar tutor</strong>
        <span>Criar responsavel antes do paciente.</span>
      </RouterLink>
      <RouterLink class="operation-link operation-link--primary" to="/patients/new">
        <strong>Cadastrar paciente</strong>
        <span>Vincular animal a um tutor existente.</span>
      </RouterLink>
      <RouterLink class="operation-link operation-link--primary" to="/appointments/new">
        <strong>Criar agendamento</strong>
        <span>Usar a Agenda como coluna temporal.</span>
      </RouterLink>
      <RouterLink class="operation-link operation-link--primary" to="/queue">
        <strong>Abrir Esteira</strong>
        <span>Acompanhar check-ins e proximas acoes.</span>
      </RouterLink>
    </section>

    <section v-if="searched" class="reception-results" aria-label="Resultados da busca da recepcao">
      <div class="results-section">
        <div class="results-section__head">
          <div>
            <h2>Tutores encontrados</h2>
            <p>{{ owners.length }} resultado(s)</p>
          </div>
          <RouterLink class="text-link" to="/owners">Abrir lista completa</RouterLink>
        </div>

        <div v-if="owners.length > 0" class="result-list">
          <article v-for="owner in owners" :key="owner.id" class="result-row">
            <div class="result-row__body">
              <span class="result-row__eyebrow">Tutor</span>
              <strong>{{ owner.fullName }}</strong>
              <p>
                {{ owner.documentId || 'Documento nao informado' }} ·
                {{ ownerPrimaryContact(owner) }}
              </p>
            </div>
            <div class="result-row__actions">
              <RouterLink class="button-link button-link--secondary" :to="`/owners/${owner.id}`">
                Abrir cadastro
              </RouterLink>
              <RouterLink
                class="button-link button-link--secondary"
                :to="`/patients/new?ownerId=${encode(owner.id)}`"
              >
                Cadastrar paciente
              </RouterLink>
              <RouterLink
                class="button-link button-link--primary"
                :to="`/appointments/new?ownerId=${encode(owner.id)}`"
              >
                Criar agendamento
              </RouterLink>
              <RouterLink class="button-link button-link--secondary" :to="quotePath(owner.id)">
                Criar orçamento
              </RouterLink>
              <RouterLink
                class="button-link button-link--secondary"
                :to="counterSalePath(owner.id)"
              >
                Abrir comanda
              </RouterLink>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          icon="TU"
          title="Nenhum tutor encontrado"
          description="Cadastre o tutor ou ajuste a busca antes de seguir para paciente, agenda ou esteira."
          size="sm"
        >
          <template #action>
            <RouterLink class="button-link button-link--primary" to="/owners/new"
              >Cadastrar tutor</RouterLink
            >
          </template>
        </EmptyState>
      </div>

      <div class="results-section">
        <div class="results-section__head">
          <div>
            <h2>Pacientes encontrados</h2>
            <p>{{ patients.length }} resultado(s)</p>
          </div>
          <RouterLink class="text-link" to="/patients">Abrir lista completa</RouterLink>
        </div>

        <div v-if="patients.length > 0" class="result-list">
          <article v-for="patient in patients" :key="patient.id" class="result-row">
            <div class="result-row__body">
              <span class="result-row__eyebrow">Paciente</span>
              <strong>{{ patient.name }}</strong>
              <p>
                {{ patient.species || 'Especie nao informada' }}
                <span v-if="patient.breed"> · {{ patient.breed }}</span>
                · Tutor {{ ownerLabel(patient.primaryOwnerId) }}
              </p>
            </div>
            <div class="result-row__actions">
              <RouterLink
                class="button-link button-link--secondary"
                :to="`/patients/${patient.id}`"
              >
                Abrir cadastro
              </RouterLink>
              <RouterLink
                class="button-link button-link--primary"
                :to="appointmentPath(patient.primaryOwnerId, patient.id)"
              >
                Criar agendamento
              </RouterLink>
              <RouterLink
                class="button-link button-link--secondary"
                :to="queueCheckInPath(patient.primaryOwnerId, patient.id)"
              >
                Preparar check-in
              </RouterLink>
              <RouterLink
                class="button-link button-link--cautious"
                :to="encounterPath(patient.primaryOwnerId, patient.id)"
              >
                Abrir atendimento
              </RouterLink>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          icon="PA"
          title="Nenhum paciente encontrado"
          description="Cadastre o paciente ou crie o agendamento quando o tutor ja estiver identificado."
          size="sm"
        >
          <template #action>
            <RouterLink class="button-link button-link--primary" to="/patients/new"
              >Cadastrar paciente</RouterLink
            >
          </template>
        </EmptyState>
      </div>
    </section>

    <section class="secondary-shortcuts" aria-label="Atalhos secundarios da recepcao">
      <div class="secondary-shortcuts__head">
        <h2>Atalhos secundarios</h2>
        <p>Use apenas quando o contexto operacional ja estiver claro.</p>
      </div>
      <div class="secondary-shortcuts__links">
        <RouterLink class="operation-link operation-link--secondary" to="/quotes">
          <strong>Orcamentos</strong>
          <span>Atalho comercial sem criar fluxo clinico.</span>
        </RouterLink>
        <RouterLink class="operation-link operation-link--secondary" to="/counter-sales">
          <strong>Venda balcao</strong>
          <span>Uso comercial, sem alterar regra financeira.</span>
        </RouterLink>
        <RouterLink class="operation-link operation-link--secondary" to="/encounters/new">
          <strong>Atendimento direto</strong>
          <span>Secundario; prefira Agenda ou Esteira quando houver chegada.</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader, {
  type PageAction,
  type PageBreadcrumb,
  type PageContextItem,
  type PageNextStep
} from '@/components/AppPageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { billingService } from '@/services/billing';
import { clinicalHandoffService } from '@/services/clinicalHandoff';
import { laboratoryService } from '@/services/laboratory';
import {
  vaccinesDewormersService,
  type PreventiveEventSummary
} from '@/services/vaccinesDewormers';
import { listQueue } from '@/services/scheduling';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
import type { BillingRecordSummary } from '@/types/billing';
import type { ClinicalHandoffSummary } from '@/types/clinicalHandoff';
import type { QueueEntrySummary, QueuePriority, QueueStatus } from '@/types/scheduling';
import type { DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import { formatDateTime } from '@/utils/labels';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const query = ref('');
const loading = ref(false);
const error = ref('');
const searched = ref(false);
const owners = ref<OwnerSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const patientLaboratoryOrders = ref<DiagnosticOrderSummary[]>([]);
const patientPreventiveEvents = ref<PreventiveEventSummary[]>([]);
const patientBillingRecords = ref<BillingRecordSummary[]>([]);
const queueEntries = ref<QueueEntrySummary[]>([]);
const queueLoading = ref(false);
const queueError = ref('');
const clinicalHandoffs = ref<ClinicalHandoffSummary[]>([]);
const handoffLoading = ref(false);
const handoffError = ref('');
const acknowledgingHandoffId = ref<string | null>(null);
const handoffInboxMode = ref<'pending' | 'acknowledged'>('pending');

const hasQuery = computed(() => query.value.trim().length > 0);

interface ContextualQuickAction {
  key: string;
  label: string;
  title: string;
  description: string;
  to: string;
  tone: 'primary' | 'secondary' | 'warning';
}

function patientPriority360Action(patient: PatientSummary): ContextualQuickAction | null {
  const pendingLaboratoryCount = patientLaboratoryOrders.value.filter(
    (order) =>
      order.patientId === patient.id && (order.status === 'requested' || order.status === 'collected')
  ).length;
  const overduePreventiveCount = patientPreventiveEvents.value.filter(
    (event) =>
      (event.patientId === patient.id || event.animalName === patient.name) &&
      event.status === 'scheduled' &&
      isPastDate(event.eventDate)
  ).length;
  const openBillingAmount = patientBillingRecords.value
    .filter((record) => record.patientId === patient.id && record.status !== 'settled')
    .reduce((sum, record) => sum + record.subtotalAmount, 0);

  if (
    pendingLaboratoryCount === 0 &&
    overduePreventiveCount === 0 &&
    openBillingAmount === 0 &&
    !patient.chronicDisease &&
    !patient.allergy
  ) {
    return null;
  }

  if (pendingLaboratoryCount > 0) {
    const preventiveSuffix =
      overduePreventiveCount > 0 ? ` e ${overduePreventiveCount} preventivo(s) vencido(s)` : '';

    return {
      key: 'patient-priority-360',
      label: 'Prioridade 360',
      title: 'Exames pendentes',
      description: `${pendingLaboratoryCount} exame(s) pendente(s)${preventiveSuffix}. Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.`,
      to: `/patients/${patient.id}`,
      tone: 'warning'
    };
  }

  if (overduePreventiveCount > 0) {
    return {
      key: 'patient-priority-360',
      label: 'Prioridade 360',
      title: 'Preventivo vencido',
      description: `${overduePreventiveCount} preventivo(s) vencido(s). Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.`,
      to: `/patients/${patient.id}`,
      tone: 'warning'
    };
  }

  if (openBillingAmount > 0) {
    return {
      key: 'patient-priority-360',
      label: 'Prioridade 360',
      title: 'Pendência financeira',
      description: `${formatCurrency(openBillingAmount, 'BRL')} em aberto. Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.`,
      to: `/patients/${patient.id}`,
      tone: 'warning'
    };
  }

  return {
    key: 'patient-priority-360',
    label: 'Prioridade 360',
    title: 'Atenção clínica',
    description: 'Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.',
    to: `/patients/${patient.id}`,
    tone: 'warning'
  };
}

function formatCurrency(value: number, currency: string): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency });
}

function isPastDate(value: string): boolean {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() < today.getTime();
}

const ownersById = computed(() => {
  const map = new Map<string, OwnerSummary>();
  for (const owner of owners.value) {
    map.set(owner.id, owner);
  }
  return map;
});

const contextualQuickActions = computed<ContextualQuickAction[]>(() => {
  const actions: ContextualQuickAction[] = [];
  const firstOwner = owners.value[0] ?? null;
  const firstPatient = patients.value[0] ?? null;
  const ownerId = firstPatient?.primaryOwnerId ?? firstOwner?.id ?? '';
  const patientId = firstPatient?.id ?? '';

  if (firstPatient && ownerId) {
    const priorityAction = patientPriority360Action(firstPatient);
    if (priorityAction) {
      actions.push(priorityAction);
    }

    actions.push({
      key: 'patient-cockpit',
      label: 'Cockpit',
      title: `Abrir ${firstPatient.name}`,
      description: 'Ficha 360 do paciente com agenda, comanda, exames e histórico.',
      to: `/patients/${firstPatient.id}`,
      tone: 'primary'
    });
    actions.push({
      key: 'schedule-patient',
      label: 'Agenda',
      title: 'Agendar paciente',
      description: 'Cria compromisso já com tutor e paciente preenchidos.',
      to: appointmentPath(ownerId, patientId),
      tone: 'secondary'
    });
    actions.push({
      key: 'queue-patient',
      label: 'Check-in',
      title: 'Preparar esteira',
      description: 'Abre fila com contexto de recepção e paciente selecionado.',
      to: queueCheckInPath(ownerId, patientId),
      tone: 'warning'
    });
    actions.push({
      key: 'counter-sale-patient',
      label: 'Comanda',
      title: 'Abrir comanda',
      description: 'Encaminha cobrança com tutor e paciente preservados.',
      to: queueCounterSalePath({
        id: `quick-${patientId}`,
        accountId: firstPatient.accountId,
        patientId,
        ownerId,
        appointmentId: null,
        encounterId: null,
        status: 'waiting',
        priority: 'medium',
        reason: 'Recepcao',
        checkedInAt: '',
        calledAt: null,
        createdAt: '',
        updatedAt: ''
      }),
      tone: 'secondary'
    });
    return actions;
  }

  if (firstOwner) {
    actions.push({
      key: 'owner-cockpit',
      label: 'Tutor',
      title: `Abrir ${firstOwner.fullName}`,
      description: 'Cockpit 360 do relacionamento, animais, financeiro e próximas ações.',
      to: `/owners/${firstOwner.id}`,
      tone: 'primary'
    });
    actions.push({
      key: 'new-patient',
      label: 'Paciente',
      title: 'Cadastrar animal',
      description: 'Cria paciente já vinculado ao tutor localizado.',
      to: `/patients/new?ownerId=${encode(firstOwner.id)}`,
      tone: 'secondary'
    });
    actions.push({
      key: 'schedule-owner',
      label: 'Agenda',
      title: 'Agendar tutor',
      description: 'Prepara agendamento com tutor preenchido.',
      to: appointmentPath(firstOwner.id),
      tone: 'secondary'
    });
    actions.push({
      key: 'counter-sale-owner',
      label: 'Comanda',
      title: 'Venda/comanda',
      description: 'Abre fluxo comercial com tutor preservado.',
      to: counterSalePath(firstOwner.id),
      tone: 'warning'
    });
  }

  return actions;
});

const headerBreadcrumbs: PageBreadcrumb[] = [
  { label: 'Inicio', to: '/' },
  { label: 'Atendimento', to: '/appointments' },
  { label: 'Recepcao', current: true }
];

const headerContextItems = computed<PageContextItem[]>(() => [
  {
    key: 'search',
    label: 'Busca',
    value: searched.value ? query.value.trim() || 'Sem termo ativo' : 'Aguardando entrada',
    tone: searched.value ? 'info' : 'neutral'
  },
  {
    key: 'owners',
    label: 'Tutores',
    value: String(owners.value.length)
  },
  {
    key: 'patients',
    label: 'Pacientes',
    value: String(patients.value.length)
  },
  {
    key: 'queue',
    label: 'Esteira',
    value: String(activeQueueEntries.value.length),
    tone: activeQueueEntries.value.length > 0 ? 'warning' : 'neutral'
  },
  {
    key: 'handoffs',
    label: 'Handoffs',
    value: String(pendingHandoffs.value.length),
    tone: pendingHandoffs.value.length > 0 ? 'warning' : 'neutral'
  }
]);

const headerNextSteps = computed<PageNextStep[]>(() => {
  if (!searched.value) {
    return [
      {
        key: 'search',
        label: 'Buscar tutor ou paciente',
        description: 'Depois direcione para cadastro, Agenda ou Esteira'
      }
    ];
  }

  if (patients.value.length > 0) {
    return [
      {
        key: 'schedule',
        label: 'Criar agendamento',
        description: 'Agenda organiza a chegada antes da Esteira',
        to: appointmentPath(patients.value[0].primaryOwnerId, patients.value[0].id)
      }
    ];
  }

  if (owners.value.length > 0) {
    return [
      {
        key: 'patient',
        label: 'Cadastrar paciente vinculado',
        description: owners.value[0].fullName,
        to: `/patients/new?ownerId=${encode(owners.value[0].id)}`
      }
    ];
  }

  return [
    {
      key: 'new-owner',
      label: 'Cadastrar tutor',
      description: 'Nenhum registro encontrado para a busca',
      to: '/owners/new'
    }
  ];
});

const headerPrimaryAction: PageAction = {
  key: 'new-appointment',
  label: 'Criar agendamento',
  variant: 'primary',
  to: '/appointments/new'
};

const headerSecondaryActions: PageAction[] = [
  { key: 'new-owner', label: 'Novo tutor', variant: 'secondary', to: '/owners/new' },
  { key: 'new-patient', label: 'Novo paciente', variant: 'secondary', to: '/patients/new' },
  { key: 'agenda', label: 'Abrir Agenda', variant: 'secondary', to: '/appointments' },
  { key: 'queue', label: 'Abrir Esteira', variant: 'secondary', to: '/queue' }
];

const receptionQueueStatuses = new Set<QueueStatus>(['waiting', 'called']);
const clinicalQueueStatuses = new Set<QueueStatus>(['in_triage', 'in_care', 'observation']);

const activeQueueEntries = computed(() =>
  queueEntries.value.filter((entry) => entry.status !== 'completed' && entry.status !== 'cancelled')
);

const receptionQueueCount = computed(
  () => queueEntries.value.filter((entry) => receptionQueueStatuses.has(entry.status)).length
);

const clinicalQueueCount = computed(
  () => queueEntries.value.filter((entry) => clinicalQueueStatuses.has(entry.status)).length
);

const completedQueueCount = computed(
  () => queueEntries.value.filter((entry) => entry.status === 'completed').length
);

const cancelledQueueCount = computed(
  () => queueEntries.value.filter((entry) => entry.status === 'cancelled').length
);

const pendingHandoffs = computed(() =>
  clinicalHandoffs.value.filter((handoff) => handoff.handoffStatus === 'sent_to_reception')
);

const urgentPendingHandoffs = computed(
  () =>
    pendingHandoffs.value.filter(
      (handoff) => handoff.priority === 'high' || handoff.priority === 'critical'
    ).length
);

const acknowledgedHandoffs = computed(() =>
  clinicalHandoffs.value.filter((handoff) => handoff.handoffStatus === 'acknowledged_by_reception')
);

const visibleClinicalHandoffs = computed(() =>
  handoffInboxMode.value === 'pending' ? pendingHandoffs.value : acknowledgedHandoffs.value
);

const handoffEmptyTitle = computed(() =>
  handoffInboxMode.value === 'pending'
    ? 'Nenhum handoff aguardando recepcao'
    : 'Nenhum handoff recebido nesta lista'
);

const handoffEmptyDescription = computed(() =>
  handoffInboxMode.value === 'pending'
    ? 'Casos enviados pela clinica aparecerao aqui para confirmacao minima.'
    : 'Handoffs confirmados pela recepcao permanecem visiveis aqui para conferencia operacional.'
);

onMounted(() => {
  void loadQueue();
  void loadClinicalHandoffs();
});

async function loadQueue() {
  queueLoading.value = true;
  queueError.value = '';

  try {
    queueEntries.value = await listQueue();
  } catch (err: unknown) {
    queueEntries.value = [];
    queueError.value =
      err instanceof Error ? err.message : 'Nao foi possivel carregar a esteira operacional';
  } finally {
    queueLoading.value = false;
  }
}

async function loadClinicalHandoffs() {
  handoffLoading.value = true;
  handoffError.value = '';

  try {
    clinicalHandoffs.value = await clinicalHandoffService.list();
  } catch (err: unknown) {
    clinicalHandoffs.value = [];
    handoffError.value =
      err instanceof Error ? err.message : 'Nao foi possivel carregar handoffs clinicos';
  } finally {
    handoffLoading.value = false;
  }
}

async function acknowledgeClinicalHandoff(handoffId: string) {
  acknowledgingHandoffId.value = handoffId;
  handoffError.value = '';

  try {
    await clinicalHandoffService.acknowledge(handoffId, {
      note: 'Recepcao confirmou recebimento do handoff clinico.'
    });
    await loadClinicalHandoffs();
  } catch (err: unknown) {
    handoffError.value =
      err instanceof Error ? err.message : 'Nao foi possivel confirmar recebimento';
  } finally {
    acknowledgingHandoffId.value = null;
  }
}

async function runSearch() {
  const search = query.value.trim();
  searched.value = true;
  error.value = '';

  if (!search) {
    owners.value = [];
    patients.value = [];
    patientLaboratoryOrders.value = [];
    patientPreventiveEvents.value = [];
    patientBillingRecords.value = [];
    return;
  }

  loading.value = true;
  try {
    const [ownerItems, patientItems] = await Promise.all([
      ownerService.list({ search, status: 'all' }),
      patientService.list({ search, status: 'all' })
    ]);
    owners.value = ownerItems;
    patients.value = patientItems;
    await loadPatientPriorityContext(patientItems);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao buscar tutor ou paciente';
    owners.value = [];
    patients.value = [];
    patientLaboratoryOrders.value = [];
    patientPreventiveEvents.value = [];
    patientBillingRecords.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadPatientPriorityContext(patientItems: PatientSummary[]) {
  if (patientItems.length === 0) {
    patientLaboratoryOrders.value = [];
    patientPreventiveEvents.value = [];
    patientBillingRecords.value = [];
    return;
  }

  const contextResults = await Promise.allSettled(
    patientItems.flatMap((patient) => [
      laboratoryService.listOrders({ patientId: patient.id }),
      vaccinesDewormersService.list({
        patientId: patient.id,
        ownerId: patient.primaryOwnerId,
        includeExecuted: true
      }),
      billingService.list({ ownerId: patient.primaryOwnerId })
    ])
  );

  patientLaboratoryOrders.value = contextResults
    .filter(
      (result): result is PromiseFulfilledResult<DiagnosticOrderSummary[]> =>
        result.status === 'fulfilled' && isDiagnosticOrderList(result.value)
    )
    .flatMap((result) => result.value);

  patientPreventiveEvents.value = contextResults
    .filter(
      (result): result is PromiseFulfilledResult<PreventiveEventSummary[]> =>
        result.status === 'fulfilled' && isPreventiveEventList(result.value)
    )
    .flatMap((result) => result.value);

  patientBillingRecords.value = contextResults
    .filter(
      (result): result is PromiseFulfilledResult<BillingRecordSummary[]> =>
        result.status === 'fulfilled' && isBillingRecordList(result.value)
    )
    .flatMap((result) => result.value);
}

function isDiagnosticOrderList(value: unknown[]): value is DiagnosticOrderSummary[] {
  return value.every(
    (item) => typeof item === 'object' && item !== null && 'examType' in item && 'status' in item
  );
}

function isPreventiveEventList(value: unknown[]): value is PreventiveEventSummary[] {
  return value.every(
    (item) => typeof item === 'object' && item !== null && 'itemType' in item && 'eventDate' in item
  );
}

function isBillingRecordList(value: unknown[]): value is BillingRecordSummary[] {
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'subtotalAmount' in item &&
      'ownerId' in item &&
      'patientId' in item
  );
}

function clearSearch() {
  query.value = '';
  searched.value = false;
  error.value = '';
  owners.value = [];
  patients.value = [];
  patientLaboratoryOrders.value = [];
  patientPreventiveEvents.value = [];
  patientBillingRecords.value = [];
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

function appointmentPath(ownerId: string, patientId?: string): string {
  const params = new URLSearchParams();
  if (ownerId) params.set('ownerId', ownerId);
  if (patientId) params.set('patientId', patientId);
  const queryString = params.toString();
  return `/appointments/new${queryString ? `?${queryString}` : ''}`;
}

function queueCheckInPath(ownerId: string, patientId: string): string {
  const params = new URLSearchParams({
    patientId,
    ownerId,
    reason: 'Recepcao'
  });
  return `/queue?${params.toString()}`;
}

function quotePath(ownerId: string): string {
  return `/quotes?ownerId=${encode(ownerId)}`;
}

function counterSalePath(ownerId: string): string {
  return `/counter-sales?ownerId=${encode(ownerId)}`;
}

function queueCounterSalePath(entry: QueueEntrySummary): string {
  const params = new URLSearchParams();
  if (entry.encounterId) {
    params.set('encounterId', entry.encounterId);
  }
  params.set('patientId', entry.patientId);
  params.set('ownerId', entry.ownerId);
  return `/counter-sales?${params.toString()}`;
}

function encounterPath(ownerId: string, patientId: string): string {
  const params = new URLSearchParams({ ownerId, patientId });
  return `/encounters/new?${params.toString()}`;
}

function ownerPrimaryContact(owner: OwnerSummary): string {
  const contact = owner.contacts.find((item) => item.primary) ?? owner.contacts[0];
  return contact?.value || 'Contato nao informado';
}

function ownerLabel(ownerId: string): string {
  return ownersById.value.get(ownerId)?.fullName || ownerId;
}

function queueStatusLabel(status: QueueStatus): string {
  const labels: Record<QueueStatus, string> = {
    waiting: 'Aguardando recepção',
    called: 'Chamado pela recepção',
    in_triage: 'Em triagem',
    in_care: 'Em atendimento',
    observation: 'Em observação',
    completed: 'Finalizado',
    cancelled: 'Cancelado'
  };
  return labels[status] ?? status;
}

function queuePriorityLabel(priority: QueuePriority): string {
  const labels: Record<QueuePriority, string> = {
    critical: 'critica',
    high: 'alta',
    medium: 'media',
    low: 'baixa'
  };
  return labels[priority] ?? priority;
}

function handoffPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    critical: 'Prioridade critica',
    high: 'Prioridade alta',
    medium: 'Prioridade media',
    low: 'Prioridade baixa'
  };
  return labels[priority] ?? priority;
}

function handoffStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ready_to_send: 'Preparando',
    sent_to_reception: 'Aguardando recepção',
    acknowledged_by_reception: 'Recebido pela recepção'
  };
  return labels[status] ?? status;
}
</script>

<style scoped>
.reception-gateway-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reception-search {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  gap: 12px;
  align-items: end;
  padding: 16px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 8px;
  background: #ffffff;
}

.reception-workflow,
.reception-primary-actions,
.secondary-shortcuts__links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.workflow-step,
.operation-link,
.contextual-quick-actions,
.contextual-action,
.result-row,
.handoff-preview,
.reception-funnel,
.queue-preview-row,
.results-section,
.secondary-shortcuts {
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 8px;
  background: #ffffff;
}

.contextual-quick-actions {
  padding: 16px;
}

.contextual-quick-actions__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.contextual-quick-actions__head h2 {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 18px;
}

.contextual-quick-actions__head p,
.contextual-action small {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.4;
}

.contextual-quick-actions__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.contextual-action {
  display: grid;
  gap: 5px;
  min-height: 106px;
  padding: 12px;
  text-decoration: none;
}

.contextual-action span {
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.contextual-action strong {
  color: var(--color-text, #0f172a);
}

.contextual-action--primary {
  border-left: 4px solid #0f766e;
}

.contextual-action--secondary {
  background: #f8fafc;
}

.contextual-action--warning {
  border-left: 4px solid #f59e0b;
  background: #fffbeb;
}

.workflow-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
}

.workflow-step__number {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #e2e8f0;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
}

.workflow-step strong,
.operation-link strong,
.queue-preview-row strong,
.result-row strong,
.secondary-shortcuts h2,
.results-section h2,
.handoff-preview h2,
.reception-funnel h2 {
  color: var(--color-text, #0f172a);
}

.workflow-step p,
.operation-link span,
.handoff-preview p,
.reception-funnel p,
.queue-preview-row p,
.result-row p,
.secondary-shortcuts p,
.results-section p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.4;
}

.handoff-preview,
.reception-funnel {
  padding: 16px;
}

.reception-funnel__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.reception-funnel__eyebrow,
.queue-preview-row__eyebrow {
  display: block;
  margin-bottom: 5px;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.handoff-preview h2,
.reception-funnel h2 {
  margin: 0;
  font-size: 18px;
}

.funnel-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.handoff-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.funnel-metric {
  min-width: 0;
  padding: 12px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
}

.handoff-metric {
  min-width: 0;
  padding: 12px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
}

.funnel-metric span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.handoff-metric span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.funnel-metric strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 24px;
  line-height: 1;
}

.handoff-metric strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 24px;
  line-height: 1;
}

.handoff-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.handoff-tab {
  min-height: 34px;
  padding: 7px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.handoff-tab--active {
  border-color: #0f766e;
  background: #ecfdf5;
  color: #0f766e;
}

.handoff-ack-note {
  color: #0f766e;
  font-weight: 700;
}

.queue-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.queue-preview--loading {
  padding: 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  background: #f8fafc;
}

.queue-preview-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 14px;
  background: #ffffff;
}

.queue-preview-row__body {
  min-width: 0;
}

.queue-preview-row__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  align-content: flex-start;
}

.operation-link {
  display: flex;
  flex-direction: column;
  min-height: 88px;
  padding: 14px 16px;
  text-decoration: none;
}

.operation-link--primary {
  border-left: 4px solid #0f766e;
}

.operation-link--secondary {
  background: #f8fafc;
}

.reception-results {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.results-section {
  padding: 16px;
}

.results-section__head,
.secondary-shortcuts__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.results-section h2,
.secondary-shortcuts h2 {
  margin: 0;
  font-size: 18px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 14px;
  background: #f8fafc;
}

.result-row__body {
  min-width: 0;
}

.result-row__eyebrow {
  display: block;
  margin-bottom: 5px;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.result-row__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
  align-content: flex-start;
}

.button-link,
.text-link {
  color: #0f766e;
  font-weight: 700;
  text-decoration: none;
}

.button-link {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
}

.button-link--primary {
  border-color: #0f766e;
  background: #0f766e;
  color: #ffffff;
}

.button-link--cautious {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #475569;
}

.secondary-shortcuts {
  padding: 16px;
}

@media (max-width: 860px) {
  .reception-search,
  .reception-results,
  .funnel-metrics,
  .handoff-metrics,
  .contextual-quick-actions__grid,
  .queue-preview-row,
  .result-row {
    grid-template-columns: 1fr;
  }

  .reception-funnel__head,
  .contextual-quick-actions__head {
    flex-direction: column;
  }

  .queue-preview-row__actions,
  .result-row__actions {
    justify-content: flex-start;
  }
}
</style>
