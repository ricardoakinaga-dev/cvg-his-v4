<template>
  <div class="patient-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="42%" />
      <div class="page-loading__content">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" width="72%" />
      </div>
    </div>

    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <template v-else-if="patient">
      <AppPageHeader>
        <template #title>{{ patient.name }}</template>
        <template #subtitle>
          <StatusBadge
            :label="patientStatusLabel(patient.status)"
            :variant="patientStatusVariant(patient.status)"
          />
          <StatusBadge
            v-if="focalEncounter"
            :label="encounterStatusLabel(focalEncounter.status)"
            :variant="encounterStatusVariant(focalEncounter.status)"
          />
          <StatusBadge
            v-if="focalInpatientStay"
            :label="`Internado · ${inpatientStatusLabel(focalInpatientStay.status)}`"
            variant="warning"
          />
          <span class="muted">Atendimento &gt; Cadastrados</span>
          <span class="muted">{{ patient.id }}</span>
        </template>
        <template #actions>
          <DsButton
            tag="a"
            :to="`/appointments/new?patientId=${patient.id}&ownerId=${patient.primaryOwnerId}`"
            variant="secondary"
          >
            Agendar
          </DsButton>
          <DsButton
            tag="a"
            :to="`/encounters/new?patientId=${patient.id}&ownerId=${patient.primaryOwnerId}`"
            variant="primary"
          >
            Novo Atendimento
          </DsButton>
          <DsButton
            tag="a"
            :to="focalEncounter ? `/medical-records/${focalEncounter.id}` : '/medical-records'"
            variant="secondary"
          >
            Prontuário
          </DsButton>
          <DsButton tag="a" :to="`/patients/${patient.id}/edit`" variant="ghost">Editar</DsButton>
        </template>
      </AppPageHeader>

      <section class="hub-kpis">
        <DsStatCard
          :label="
            upcomingAppointments.length === 1
              ? '1 agendamento futuro'
              : `${upcomingAppointments.length} agendamentos futuros`
          "
          value=""
          icon="📅"
        />
        <DsStatCard
          :label="
            activeEncounters.length === 1
              ? '1 atendimento ativo'
              : `${activeEncounters.length} atendimentos ativos`
          "
          value=""
          icon="🩺"
        />
        <DsStatCard
          :label="
            patientRecords.length === 1
              ? '1 prontuário longitudinal'
              : `${patientRecords.length} prontuários longitudinais`
          "
          value=""
          icon="📋"
        />
        <DsStatCard
          :label="
            focalInpatientStay ? `${focalInpatientStay.ward} · ${focalInpatientStay.bed}` : 'Sem internação ativa'
          "
          value=""
          icon="🛏️"
        />
      </section>

      <section v-if="patientAlerts.length > 0" class="hub-alerts">
        <DsAlert
          v-for="alert in patientAlerts"
          :key="alert.title"
          :variant="alert.variant"
          dismissible
        >
          <strong>{{ alert.title }}</strong> - {{ alert.message }}
        </DsAlert>
      </section>

      <section v-if="relatedWarnings.length > 0" class="hub-alerts">
        <DsAlert variant="info" dismissible>
          <strong>Visão parcial</strong> - Alguns blocos não responderam: {{ relatedWarnings.join(', ') }}.
        </DsAlert>
      </section>

      <section v-if="actionError || actionMessage" class="hub-alerts">
        <DsAlert v-if="actionError" variant="danger" dismissible @dismiss="actionError = ''">
          {{ actionError }}
        </DsAlert>
        <DsAlert v-if="actionMessage" variant="success" dismissible @dismiss="actionMessage = ''">
          {{ actionMessage }}
        </DsAlert>
      </section>

      <section class="hub-actions">
        <DsCard title="Ações rápidas" variant="compact">
          <div class="quick-actions">
            <DsButton
              tag="a"
              :to="`/appointments/new?patientId=${patient.id}&ownerId=${patient.primaryOwnerId}`"
              variant="primary"
              icon="📅"
            >
              Agendar retorno
            </DsButton>
            <DsButton
              v-if="focalEncounter"
              tag="a"
              :to="`/encounters/${focalEncounter.id}`"
              variant="secondary"
              icon="🩺"
            >
              Abrir atendimento
            </DsButton>
            <DsButton
              v-if="focalEncounter"
              tag="a"
              :to="triageActionLink"
              variant="secondary"
              icon="🧭"
            >
              {{ focalTriage ? 'Ver triagem' : 'Nova triagem' }}
            </DsButton>
            <DsButton
              tag="a"
              :to="focalEncounter ? `/diagnostics?encounter=${focalEncounter.id}` : '/diagnostics'"
              variant="ghost"
              icon="🔬"
            >
              Exames
            </DsButton>
            <DsButton
              tag="a"
              :to="focalEncounter ? `/billing/${focalEncounter.id}` : '/billing'"
              variant="ghost"
              icon="💰"
            >
              Financeiro
            </DsButton>
          </div>
        </DsCard>
      </section>

      <section class="patient-summary-grid">
        <DsCard title="Ficha clínica">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Tutor principal</span>
              <strong>{{ ownerName }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Espécie</span>
              <strong>{{ speciesLabel(patient.species) }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Raça</span>
              <strong>{{ patient.breed || 'Não informada' }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Sexo</span>
              <strong>{{ sexLabel(patient.sex) }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Idade aproximada</span>
              <strong>{{ ageLabel }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Peso base</span>
              <strong>{{ formattedWeight }}</strong>
            </div>
          </div>
        </DsCard>

        <DsCard title="Contexto longitudinal">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Próximo agendamento</span>
              <strong>{{ nextAppointmentLabel }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Último atendimento</span>
              <strong>{{ latestEncounterLabel }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Cadastros clínicos</span>
              <strong>{{ patientRecords.length }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Cadastro</span>
              <strong>{{ formatDate(patient.createdAt) }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Atualização</span>
              <strong>{{ formatDate(patient.updatedAt) }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Status assistencial</span>
              <strong>{{ currentEpisodeLabel }}</strong>
            </div>
          </div>
        </DsCard>
      </section>

      <section class="patient-workspace-grid">
        <DsCard title="Snapshot CRM do tutor">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Tutor</span>
              <strong>{{ ownerSnapshot?.fullName || ownerName }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Contato principal</span>
              <strong>{{ ownerPrimaryContact }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Tier</span>
              <strong>{{ ownerTier.label }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Pontos</span>
              <strong>{{ ownerPoints }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Em aberto</span>
              <strong>{{ formatCurrency(ownerOpenBillingAmount, 'BRL') }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Orçamentos ativos</span>
              <strong>{{ ownerActiveQuotes.length }}</strong>
            </div>
          </div>

          <div class="info-strip">
            <strong>{{ ownerCrmStage.label }}</strong>
            <span>{{ ownerCrmStage.description }}</span>
          </div>
        </DsCard>

        <DsCard title="Pacote ativo sugerido">
          <div v-if="suggestedPackage" class="workspace-stack">
            <div class="workspace-highlight">
              <div>
                <span class="detail-item__label">Pacote</span>
                <strong>{{ suggestedPackage.title }}</strong>
                <p>{{ suggestedPackage.description }}</p>
              </div>
              <StatusBadge label="Recomendado" variant="info" />
            </div>

            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item__label">Categoria</span>
                <strong>{{ suggestedPackage.category }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Motivo</span>
                <strong>{{ suggestedPackage.reason }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Paciente foco</span>
                <strong>{{ patient.name }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Valor de referência</span>
                <strong>{{ formatCurrency(suggestedPackage.referenceValue, 'BRL') }}</strong>
              </div>
            </div>

            <div class="quick-actions">
              <DsButton
                variant="secondary"
                size="sm"
                :loading="creatingPackageQuote"
                @click="createSuggestedPackageQuote"
              >
                Criar orçamento do pacote
              </DsButton>
              <DsButton tag="a" to="/quotes" variant="ghost" size="sm">
                Abrir orçamentos
              </DsButton>
            </div>
          </div>
          <p v-else class="muted">Nenhum pacote sugerido para o momento clínico deste paciente.</p>
        </DsCard>
      </section>

      <section class="patient-workspace-grid">
        <DsCard title="Cockpit operacional atual">
          <div v-if="focalEncounter" class="workspace-stack">
            <div class="workspace-highlight">
              <div>
                <span class="detail-item__label">Motivo do atendimento</span>
                <strong>{{ focalEncounter.reason }}</strong>
              </div>
              <StatusBadge
                :label="encounterStatusLabel(focalEncounter.status)"
                :variant="encounterStatusVariant(focalEncounter.status)"
              />
            </div>

            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item__label">Origem</span>
                <strong>{{ visitTypeLabel(focalEncounter.visitType) }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Abertura</span>
                <strong>{{ formatDateTime(focalEncounter.openedAt) }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Triagem</span>
                <strong>{{ focalTriage ? triagePriorityLabel(focalTriage.priority) : 'Pendente' }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Prontuário</span>
                <strong>{{ currentMedicalRecord ? medicalRecordStatusLabel(currentMedicalRecord.record.status) : 'Ainda não aberto' }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Internação</span>
                <strong>{{ focalInpatientStay ? `${focalInpatientStay.ward} / ${focalInpatientStay.bed}` : 'Sem leito vinculado' }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Billing</span>
                <strong>{{ focalBilling ? billingStatusLabel(focalBilling.status) : 'Sem cobrança aberta' }}</strong>
              </div>
            </div>

            <div v-if="focalTriage" class="info-strip">
              <strong>Queixa principal:</strong>
              <span>{{ focalTriage.chiefComplaint }}</span>
            </div>

            <div v-if="focalTriage?.alerts.length" class="tag-list">
              <span v-for="alert in focalTriage.alerts" :key="alert" class="tag">{{ alert }}</span>
            </div>
          </div>

          <div v-else class="empty-state">
            <strong>Nenhum atendimento ativo para este paciente.</strong>
            <p>Use a agenda ou abra um novo atendimento para iniciar o cockpit operacional.</p>
          </div>
        </DsCard>

        <DsCard title="Prontuário do atendimento atual">
          <div v-if="currentMedicalRecord" class="workspace-stack">
            <div class="entry-metrics">
              <div class="entry-metric">
                <span class="entry-metric__value">{{ focalRecordEntries.length }}</span>
                <span class="entry-metric__label">Entradas</span>
              </div>
              <div class="entry-metric">
                <span class="entry-metric__value">{{ currentEntryStats.prescriptions }}</span>
                <span class="entry-metric__label">Prescrições</span>
              </div>
              <div class="entry-metric">
                <span class="entry-metric__value">{{ currentEntryStats.assessments }}</span>
                <span class="entry-metric__label">Exames/avaliações</span>
              </div>
              <div class="entry-metric">
                <span class="entry-metric__value">{{ currentEntryStats.conducts }}</span>
                <span class="entry-metric__label">Condutas</span>
              </div>
            </div>

            <div v-if="focalRecordEntries.length" class="record-list">
              <div v-for="entry in focalRecordEntries.slice(0, 5)" :key="entry.id" class="record-list__item">
                <div>
                  <strong>{{ entry.title }}</strong>
                  <p>{{ clinicalEntryTypeLabel(entry.entryType) }}</p>
                </div>
                <span>{{ formatDateTime(entry.updatedAt) }}</span>
              </div>
            </div>
            <p v-else class="muted">Prontuário criado, mas ainda sem entradas clínicas.</p>

            <DsButton
              v-if="focalEncounter"
              tag="a"
              :to="`/medical-records/${focalEncounter.id}`"
              variant="secondary"
              size="sm"
            >
              Abrir prontuário completo
            </DsButton>
          </div>

          <div v-else class="empty-state">
            <strong>Prontuário ainda não consolidado.</strong>
            <p>O paciente já pode seguir para atendimento, mas ainda não há prontuário vinculado ao episódio atual.</p>
          </div>
        </DsCard>
      </section>

      <section class="patient-workspace-grid">
        <DsCard title="Agenda futura">
          <div v-if="upcomingAppointments.length" class="timeline-list">
            <div
              v-for="appointment in upcomingAppointments.slice(0, 5)"
              :key="appointment.id"
              class="timeline-list__item"
            >
              <div>
                <strong>{{ appointment.reason }}</strong>
                <p>{{ appointmentStatusLabel(appointment.status) }}</p>
              </div>
              <span>{{ formatDateTime(appointment.scheduledAt) }}</span>
            </div>
          </div>
          <p v-else class="muted">Nenhum agendamento futuro para este paciente.</p>
        </DsCard>

        <DsCard title="Últimos atendimentos">
          <div v-if="sortedEncounters.length" class="timeline-list">
            <div
              v-for="encounter in sortedEncounters.slice(0, 5)"
              :key="encounter.id"
              class="timeline-list__item"
            >
              <div>
                <strong>{{ encounter.reason }}</strong>
                <p>{{ encounterStatusLabel(encounter.status) }}</p>
              </div>
              <span>{{ formatDateTime(encounter.openedAt) }}</span>
            </div>
          </div>
          <p v-else class="muted">Nenhum atendimento encontrado para este paciente.</p>
        </DsCard>
      </section>

      <section class="patient-workspace-grid">
        <DsCard title="Timeline clínica recente">
          <div v-if="combinedTimeline.length" class="timeline-list">
            <div
              v-for="item in combinedTimeline"
              :key="item.id"
              class="timeline-list__item timeline-list__item--stacked"
            >
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }}</p>
              </div>
              <div class="timeline-list__meta">
                <span class="tag tag--neutral">{{ item.source }}</span>
                <span>{{ formatDateTime(item.occurredAt) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="muted">Sem eventos clínicos recentes no episódio atual.</p>
        </DsCard>

        <DsCard title="Financeiro e internação">
          <div class="workspace-stack">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item__label">Resumo financeiro</span>
                <strong>{{ focalBilling ? formatCurrency(focalBilling.subtotalAmount, focalBilling.currency) : 'Sem cobrança aberta' }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Status da cobrança</span>
                <strong>{{ focalBilling ? billingStatusLabel(focalBilling.status) : 'Não iniciado' }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Internação</span>
                <strong>{{ focalInpatientStay ? inpatientStatusLabel(focalInpatientStay.status) : 'Sem internação' }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">Leito atual</span>
                <strong>{{ focalInpatientStay ? `${focalInpatientStay.ward} / ${focalInpatientStay.bed}` : 'Não vinculado' }}</strong>
              </div>
            </div>

            <div v-if="focalBilling?.administrativeNotes" class="info-strip">
              <strong>Observação financeira:</strong>
              <span>{{ focalBilling.administrativeNotes }}</span>
            </div>

            <div class="quick-actions">
              <DsButton
                tag="a"
                :to="focalEncounter ? `/billing/${focalEncounter.id}` : '/billing'"
                variant="secondary"
                size="sm"
              >
                Ver faturamento
              </DsButton>
              <DsButton
                tag="a"
                :to="focalInpatientStay ? `/inpatient/${focalInpatientStay.id}` : '/inpatient'"
                variant="ghost"
                size="sm"
              >
                Ver internação
              </DsButton>
            </div>
          </div>
        </DsCard>
      </section>

      <section class="patient-workspace-grid">
        <DsCard title="Mensagens contextuais por animal">
          <div class="record-list">
            <div
              v-for="message in contextualMessages"
              :key="message.id"
              class="record-list__item record-list__item--stacked"
            >
              <div>
                <strong>{{ message.title }}</strong>
                <p>{{ message.preview }}</p>
              </div>
              <div class="quick-actions">
                <DsButton
                  v-if="message.href"
                  :href="message.href"
                  variant="secondary"
                  size="sm"
                >
                  Enviar
                </DsButton>
                <DsButton tag="a" to="/notifications/whatsapp" variant="ghost" size="sm">
                  Hub WhatsApp
                </DsButton>
              </div>
            </div>
          </div>
        </DsCard>

        <DsCard title="Snapshot comercial do tutor">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Quotes convertidos</span>
              <strong>{{ ownerConvertedQuotes }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Receita liquidada</span>
              <strong>{{ formatCurrency(ownerSettledBillingAmount, 'BRL') }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Resgate estimado</span>
              <strong>{{ formatCurrency(ownerRedeemableValue, 'BRL') }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Responsável financeiro</span>
              <strong>{{ ownerSnapshot?.financialResponsible ? 'Sim' : 'Não' }}</strong>
            </div>
          </div>
        </DsCard>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { appointmentService } from '@/services/appointment';
import { billingService } from '@/services/billing';
import { encounterService } from '@/services/encounter';
import { inpatientService } from '@/services/inpatient';
import { medicalRecordsService } from '@/services/medicalRecords';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { quoteService, type QuoteSummary } from '@/services/quotes';
import { listTriageRecords } from '@/services/triage';
import { useEntityCache } from '@/composables/useEntityCache';
import type { AppointmentSummary } from '@/types/appointment';
import type { BillingRecordSummary, BillingStatus } from '@/types/billing';
import type {
  EncounterSummary,
  EncounterTimelineEventSummary,
  EncounterStatus
} from '@/types/encounter';
import type { InpatientStaySummary, InpatientStatus } from '@/types/inpatient';
import type {
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  MedicalRecordListSummary,
  MedicalRecordStatus
} from '@/types/medicalRecords';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary, PatientStatus } from '@/types/patient';
import type { TriagePriority, TriageSummary } from '@/types/triage';
import {
  appointmentStatusLabel,
  encounterStatusLabel,
  formatDate,
  formatDateTime,
  patientStatusLabel,
  sexLabel,
  speciesLabel,
  visitTypeLabel
} from '@/utils/labels';

interface PatientAlert {
  title: string;
  message: string;
  variant: 'info' | 'success' | 'warning' | 'danger';
}

interface TimelineFeedItem {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  source: string;
}

interface SuggestedPackage {
  id: string;
  title: string;
  category: string;
  description: string;
  reason: string;
  referenceValue: number;
}

interface ContextualMessage {
  id: string;
  title: string;
  preview: string;
  href: string | null;
}

const route = useRoute();
const { getOwnerName } = useEntityCache();

const loading = ref(true);
const error = ref('');
const relatedWarnings = ref<string[]>([]);
const patient = ref<PatientSummary | null>(null);
const ownerSnapshot = ref<OwnerSummary | null>(null);
const ownerName = ref('—');
const ownerBillingRecords = ref<BillingRecordSummary[]>([]);
const ownerQuotes = ref<QuoteSummary[]>([]);
const patientAppointments = ref<AppointmentSummary[]>([]);
const patientEncounters = ref<EncounterSummary[]>([]);
const patientRecords = ref<MedicalRecordListSummary[]>([]);
const focalRecordEntries = ref<ClinicalEntrySummary[]>([]);
const focalEncounterTimeline = ref<EncounterTimelineEventSummary[]>([]);
const focalClinicalTimeline = ref<ClinicalTimelineEventSummary[]>([]);
const focalTriage = ref<TriageSummary | null>(null);
const focalInpatientStay = ref<InpatientStaySummary | null>(null);
const focalBilling = ref<BillingRecordSummary | null>(null);
const actionError = ref('');
const actionMessage = ref('');
const creatingPackageQuote = ref(false);

const patientId = computed(() => String(route.params.id ?? ''));

const sortedEncounters = computed(() =>
  [...patientEncounters.value].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
  )
);

const activeEncounters = computed(() =>
  [...patientEncounters.value]
    .filter((encounter) => encounter.status !== 'closed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
);

const focalEncounter = computed<EncounterSummary | null>(
  () => activeEncounters.value[0] ?? sortedEncounters.value[0] ?? null
);

const upcomingAppointments = computed(() =>
  [...patientAppointments.value]
    .filter(
      (appointment) =>
        appointment.status !== 'cancelled' &&
        new Date(appointment.scheduledAt).getTime() >= Date.now()
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
);

const currentMedicalRecord = computed<MedicalRecordListSummary | null>(() => {
  if (!focalEncounter.value) {
    return null;
  }

  return (
    patientRecords.value.find(
      (record) => record.record.encounterId === focalEncounter.value?.id
    ) ?? null
  );
});

const formattedWeight = computed(() => {
  if (!patient.value?.baseWeightKg) {
    return 'Não informado';
  }

  return `${patient.value.baseWeightKg} kg`;
});

const ageLabel = computed(() => {
  if (!patient.value?.birthDateApproximate) {
    return 'Não informada';
  }

  const birthDate = new Date(patient.value.birthDateApproximate);
  if (Number.isNaN(birthDate.getTime())) {
    return formatDate(patient.value.birthDateApproximate);
  }

  const now = new Date();
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0) {
    return `${Math.max(months, 1)} mes(es)`;
  }

  return months > 0 ? `${years} ano(s) e ${months} mes(es)` : `${years} ano(s)`;
});

const nextAppointmentLabel = computed(() => {
  const nextAppointment = upcomingAppointments.value[0];
  return nextAppointment ? formatDateTime(nextAppointment.scheduledAt) : 'Sem agenda futura';
});

const latestEncounterLabel = computed(() => {
  const latestEncounter = sortedEncounters.value[0];
  return latestEncounter ? formatDateTime(latestEncounter.openedAt) : 'Sem histórico assistencial';
});

const currentEpisodeLabel = computed(() => {
  if (focalEncounter.value) {
    return encounterStatusLabel(focalEncounter.value.status);
  }

  if (upcomingAppointments.value.length > 0) {
    return 'Aguardando agenda';
  }

  return 'Sem episódio aberto';
});

const currentEntryStats = computed(() => ({
  prescriptions: focalRecordEntries.value.filter((entry) => entry.entryType === 'prescription').length,
  assessments: focalRecordEntries.value.filter(
    (entry) => entry.entryType === 'assessment' || entry.entryType === 'plan'
  ).length,
  conducts: focalRecordEntries.value.filter((entry) => entry.entryType === 'conduct').length
}));

const triageActionLink = computed(() => {
  if (focalTriage.value) {
    return `/triage/${focalTriage.value.id}`;
  }

  if (focalEncounter.value && patient.value) {
    return `/triage/new?encounterId=${focalEncounter.value.id}&patientId=${patient.value.id}`;
  }

  return '/triage';
});

const ownerPrimaryContact = computed(() => {
  if (!ownerSnapshot.value) {
    return 'Não informado';
  }

  return (
    ownerSnapshot.value.contacts.find((contact) => contact.primary)?.value ||
    ownerSnapshot.value.contacts[0]?.value ||
    'Não informado'
  );
});

const ownerWhatsAppLink = computed(() => {
  if (!ownerSnapshot.value) {
    return null;
  }

  const whatsappContact = ownerSnapshot.value.contacts.find((contact) => contact.type === 'whatsapp');
  if (!whatsappContact) {
    return null;
  }

  const normalized = whatsappContact.value.replace(/\D/g, '');
  return `https://wa.me/${normalized}`;
});

const ownerOpenBillingAmount = computed(() =>
  ownerBillingRecords.value
    .filter((record) => record.status !== 'settled')
    .reduce((sum, record) => sum + record.subtotalAmount, 0)
);

const ownerSettledBillingAmount = computed(() =>
  ownerBillingRecords.value
    .filter((record) => record.status === 'settled')
    .reduce((sum, record) => sum + record.subtotalAmount, 0)
);

const ownerActiveQuotes = computed(() =>
  ownerQuotes.value.filter((quote) => quote.status === 'draft' || quote.status === 'approved')
);

const ownerConvertedQuotes = computed(
  () => ownerQuotes.value.filter((quote) => Boolean(quote.convertedToSaleId)).length
);

const ownerPoints = computed(() =>
  Math.round(
    ownerSettledBillingAmount.value / 20 +
      ownerConvertedQuotes.value * 30 +
      patientRecords.value.length * 10 +
      sortedEncounters.value.length * 8
  )
);

const ownerRedeemableValue = computed(() => Math.floor(ownerPoints.value / 100) * 25);

const ownerTier = computed(() => {
  if (ownerPoints.value >= 300) return { label: 'Platinum' };
  if (ownerPoints.value >= 180) return { label: 'Gold' };
  if (ownerPoints.value >= 90) return { label: 'Silver' };
  return { label: 'Start' };
});

const ownerCrmStage = computed(() => {
  if (ownerOpenBillingAmount.value > 0) {
    return {
      label: 'Cobrança ativa',
      description: 'Tutor com pendências abertas. Priorize negociação e comunicação contextual.'
    };
  }

  if (ownerActiveQuotes.value.length > 0) {
    return {
      label: 'Negociação em curso',
      description: 'Há orçamento ativo para o tutor. Bom momento para conversão comercial.'
    };
  }

  if (upcomingAppointments.value.length > 0) {
    return {
      label: 'Assistência programada',
      description: 'Tutor com jornada futura ativa. Ideal para lembrete e pacote preventivo.'
    };
  }

  return {
    label: 'Relacionamento estável',
    description: 'Sem pendências críticas. Use a janela para fidelização e recompra.'
  };
});

const suggestedPackage = computed<SuggestedPackage | null>(() => {
  if (!patient.value) {
    return null;
  }

  if (focalInpatientStay.value) {
    return {
      id: 'recovery-care',
      title: 'Pacote Recuperação Assistida',
      category: 'Pós-internação',
      description: 'Revisões, retornos curtos e monitoramento de evolução após estabilização.',
      reason: 'Paciente com internação recente ou ativa.',
      referenceValue: 680
    };
  }

  if (sortedEncounters.value.length >= 3) {
    return {
      id: 'continuity-clinic',
      title: 'Pacote Continuidade Clínica',
      category: 'Acompanhamento',
      description: 'Monitoramento recorrente para pacientes com histórico assistencial frequente.',
      reason: 'Paciente com recorrência de atendimentos.',
      referenceValue: 720
    };
  }

  if (patient.value.species === 'canine') {
    return {
      id: 'preventive-canine',
      title: 'Pacote Preventivo Canino',
      category: 'Preventivo',
      description: 'Consultas de rotina, janela vacinal e acompanhamento de peso.',
      reason: 'Perfil preventivo canino aderente ao cadastro atual.',
      referenceValue: 360
    };
  }

  if (patient.value.species === 'feline') {
    return {
      id: 'preventive-feline',
      title: 'Pacote Cuidado Felino',
      category: 'Preventivo',
      description: 'Retornos estruturados, revisão clínica e lembretes de prevenção.',
      reason: 'Paciente felino com oportunidade de rotina assistida.',
      referenceValue: 340
    };
  }

  return {
    id: 'baseline-care',
    title: 'Pacote Base de Acompanhamento',
    category: 'Relacionamento',
    description: 'Estrutura mínima de retornos e comunicação clínica para fidelização.',
    reason: 'Paciente ativo com oportunidade de relacionamento contínuo.',
    referenceValue: 290
  };
});

const contextualMessages = computed<ContextualMessage[]>(() => {
  if (!patient.value) {
    return [];
  }

  const ownerLabel = ownerSnapshot.value?.fullName || ownerName.value;
  const nextAppointment = upcomingAppointments.value[0];
  const messages: ContextualMessage[] = [];

  if (nextAppointment) {
    messages.push({
      id: 'appointment-reminder',
      title: 'Lembrete de retorno',
      preview: `Olá, ${ownerLabel}. Confirmando o próximo atendimento de ${patient.value.name} em ${formatDateTime(nextAppointment.scheduledAt)}.`,
      href: buildWhatsAppLink(
        `Olá, ${ownerLabel}. Confirmando o próximo atendimento de ${patient.value.name} em ${formatDateTime(nextAppointment.scheduledAt)}.`
      )
    });
  }

  if (suggestedPackage.value) {
    messages.push({
      id: 'package-offer',
      title: 'Oferta de pacote',
      preview: `${patient.value.name} está elegível ao ${suggestedPackage.value.title}. Posso te explicar como funciona?`,
      href: buildWhatsAppLink(
        `Olá, ${ownerLabel}. ${patient.value.name} está elegível ao ${suggestedPackage.value.title}. Posso te explicar como funciona?`
      )
    });
  }

  if (ownerOpenBillingAmount.value > 0) {
    messages.push({
      id: 'billing-followup',
      title: 'Follow-up financeiro',
      preview: `Temos pendências de ${formatCurrency(ownerOpenBillingAmount.value, 'BRL')} relacionadas ao acompanhamento de ${patient.value.name}.`,
      href: buildWhatsAppLink(
        `Olá, ${ownerLabel}. Temos pendências de ${formatCurrency(ownerOpenBillingAmount.value, 'BRL')} relacionadas ao acompanhamento de ${patient.value.name}.`
      )
    });
  }

  if (messages.length === 0) {
    messages.push({
      id: 'relationship',
      title: 'Mensagem de acompanhamento',
      preview: `Olá, ${ownerLabel}. Passando para acompanhar como ${patient.value.name} está evoluindo e se podemos apoiar em algo mais.`,
      href: buildWhatsAppLink(
        `Olá, ${ownerLabel}. Passando para acompanhar como ${patient.value.name} está evoluindo e se podemos apoiar em algo mais.`
      )
    });
  }

  return messages;
});

const patientAlerts = computed<PatientAlert[]>(() => {
  const alerts: PatientAlert[] = [];

  if (!patient.value) {
    return alerts;
  }

  if (patient.value.status === 'deceased') {
    alerts.push({
      title: 'Paciente sinalizado como falecido',
      message: 'Bloqueie novas jornadas assistenciais até validar o cadastro.',
      variant: 'danger'
    });
  } else if (patient.value.status === 'inactive') {
    alerts.push({
      title: 'Cadastro inativo',
      message: 'Confirme o status do paciente antes de abrir novos fluxos.',
      variant: 'warning'
    });
  }

  if (!patient.value.baseWeightKg) {
    alerts.push({
      title: 'Peso base ausente',
      message: 'Cadastre o peso para apoiar triagem, prescrição e acompanhamento.',
      variant: 'warning'
    });
  }

  if (focalEncounter.value) {
    alerts.push({
      title: 'Episódio assistencial em andamento',
      message: `${encounterStatusLabel(focalEncounter.value.status)} desde ${formatDateTime(focalEncounter.value.openedAt)}.`,
      variant: 'info'
    });
  }

  if (focalTriage.value?.priority === 'critical') {
    alerts.push({
      title: 'Triagem crítica',
      message: 'Prioridade máxima registrada para o atendimento atual.',
      variant: 'danger'
    });
  }

  if (focalInpatientStay.value) {
    alerts.push({
      title: 'Paciente internado',
      message: `${focalInpatientStay.value.ward} / ${focalInpatientStay.value.bed} em ${inpatientStatusLabel(focalInpatientStay.value.status)}.`,
      variant: 'warning'
    });
  }

  if (upcomingAppointments.value.length > 0) {
    alerts.push({
      title: 'Agenda futura confirmada',
      message: `Próximo compromisso em ${formatDateTime(upcomingAppointments.value[0].scheduledAt)}.`,
      variant: 'success'
    });
  }

  if (patientRecords.value.length === 0) {
    alerts.push({
      title: 'Sem prontuário longitudinal',
      message: 'Ainda não há registros clínicos consolidados para este paciente.',
      variant: 'info'
    });
  }

  if (ownerOpenBillingAmount.value > 0) {
    alerts.push({
      title: 'Tutor com pendência financeira',
      message: `Há ${formatCurrency(ownerOpenBillingAmount.value, 'BRL')} em aberto no relacionamento.`,
      variant: 'warning'
    });
  }

  if (ownerActiveQuotes.value.length > 0) {
    alerts.push({
      title: 'Oportunidade comercial ativa',
      message: `${ownerActiveQuotes.value.length} orçamento(s) vinculados ao tutor podem ser trabalhados neste episódio.`,
      variant: 'info'
    });
  }

  return alerts;
});

const combinedTimeline = computed<TimelineFeedItem[]>(() => {
  const encounterItems = focalEncounterTimeline.value.map((event) => ({
    id: `enc-${event.id}`,
    title: event.summary,
    description: 'Evento operacional do atendimento',
    occurredAt: event.occurredAt,
    source: 'Atendimento'
  }));

  const clinicalItems = focalClinicalTimeline.value.map((event) => ({
    id: `mr-${event.id}`,
    title: event.summary,
    description: clinicalEventLabel(event.eventType),
    occurredAt: event.occurredAt,
    source: 'Prontuário'
  }));

  return [...encounterItems, ...clinicalItems]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 8);
});

function registerWarning(scope: string) {
  if (!relatedWarnings.value.includes(scope)) {
    relatedWarnings.value.push(scope);
  }
}

function resetRelatedState() {
  relatedWarnings.value = [];
  ownerSnapshot.value = null;
  ownerBillingRecords.value = [];
  ownerQuotes.value = [];
  patientAppointments.value = [];
  patientEncounters.value = [];
  patientRecords.value = [];
  focalRecordEntries.value = [];
  focalEncounterTimeline.value = [];
  focalClinicalTimeline.value = [];
  focalTriage.value = null;
  focalInpatientStay.value = null;
  focalBilling.value = null;
  actionError.value = '';
  actionMessage.value = '';
}

function patientStatusVariant(status: PatientStatus): 'success' | 'warning' | 'danger' {
  if (status === 'active') {
    return 'success';
  }
  return status === 'deceased' ? 'danger' : 'warning';
}

function encounterStatusVariant(status: EncounterStatus): 'info' | 'warning' | 'success' {
  if (status === 'closed') {
    return 'success';
  }
  return status === 'reception' || status === 'observation' ? 'warning' : 'info';
}

function triagePriorityLabel(priority: TriagePriority): string {
  return {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  }[priority];
}

function medicalRecordStatusLabel(status: MedicalRecordStatus): string {
  return status === 'open' ? 'Aberto' : 'Concluído';
}

function billingStatusLabel(status: BillingStatus): string {
  return {
    draft: 'Rascunho',
    estimated: 'Estimado',
    open: 'Aberto',
    settled: 'Liquidado'
  }[status];
}

function inpatientStatusLabel(status: InpatientStatus): string {
  return {
    admitted: 'Admitido',
    stable: 'Estável',
    transferred: 'Transferido',
    discharged: 'Alta'
  }[status];
}

function clinicalEntryTypeLabel(entryType: ClinicalEntrySummary['entryType']): string {
  return {
    anamnesis: 'Anamnese',
    physical_exam: 'Exame físico',
    progress_note: 'Evolução',
    assessment: 'Avaliação',
    plan: 'Plano',
    prescription: 'Prescrição',
    conduct: 'Conduta'
  }[entryType];
}

function clinicalEventLabel(eventType: ClinicalTimelineEventSummary['eventType']): string {
  return {
    record_created: 'Prontuário criado',
    entry_added: 'Entrada adicionada',
    entry_updated: 'Entrada atualizada',
    entry_archived: 'Entrada arquivada',
    attachment_added: 'Anexo adicionado',
    inpatient_admitted: 'Internação iniciada',
    inpatient_progressed: 'Evolução hospitalar',
    surgery_requested: 'Cirurgia solicitada',
    surgery_status_changed: 'Status cirúrgico alterado',
    diagnostic_requested: 'Diagnóstico solicitado',
    diagnostic_collected: 'Coleta realizada',
    diagnostic_resulted: 'Resultado liberado',
    inpatient_transferred: 'Transferência hospitalar',
    inpatient_discharged: 'Alta da internação',
    surgery_pre_op: 'Pré-operatório',
    surgery_in_progress: 'Cirurgia em andamento'
  }[eventType];
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function buildWhatsAppLink(message: string): string | null {
  if (!ownerWhatsAppLink.value) {
    return null;
  }

  return `${ownerWhatsAppLink.value}?text=${encodeURIComponent(message)}`;
}

async function createSuggestedPackageQuote() {
  if (!ownerSnapshot.value || !suggestedPackage.value || !patient.value) {
    return;
  }

  creatingPackageQuote.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    const createdQuote = await quoteService.create({
      ownerId: ownerSnapshot.value.id,
      notes: `Pacote sugerido para ${patient.value.name}: ${suggestedPackage.value.title}. Motivo: ${suggestedPackage.value.reason}. Valor referência: ${formatCurrency(suggestedPackage.value.referenceValue, 'BRL')}.`
    });
    ownerQuotes.value = [createdQuote, ...ownerQuotes.value];
    actionMessage.value = `Orçamento ${createdQuote.number} criado para ${patient.value.name}.`;
  } catch (caughtError) {
    actionError.value =
      caughtError instanceof Error ? caughtError.message : 'Erro ao criar orçamento do pacote';
  } finally {
    creatingPackageQuote.value = false;
  }
}

async function loadPage() {
  if (!patientId.value) {
    error.value = 'Paciente inválido';
    return;
  }

  loading.value = true;
  error.value = '';
  ownerName.value = '—';
  patient.value = null;
  resetRelatedState();

  try {
    const loadedPatient = await patientService.getById(patientId.value);
    patient.value = loadedPatient;

    const [
      encountersResult,
      appointmentsResult,
      recordsResult,
      ownerResult,
      ownerSnapshotResult,
      ownerBillingResult,
      ownerQuotesResult
    ] = await Promise.allSettled([
      encounterService.list(),
      appointmentService.list(),
      medicalRecordsService.listAll(),
      getOwnerName(loadedPatient.primaryOwnerId),
      ownerService.getById(loadedPatient.primaryOwnerId),
      billingService.list(),
      quoteService.list()
    ]);

    if (encountersResult.status === 'fulfilled') {
      patientEncounters.value = encountersResult.value.filter(
        (encounter) => encounter.patientId === loadedPatient.id
      );
    } else {
      registerWarning('atendimentos');
    }

    if (appointmentsResult.status === 'fulfilled') {
      patientAppointments.value = appointmentsResult.value.filter(
        (appointment) => appointment.patientId === loadedPatient.id
      );
    } else {
      registerWarning('agenda');
    }

    if (recordsResult.status === 'fulfilled') {
      const patientEncounterIds = new Set(patientEncounters.value.map((encounter) => encounter.id));
      patientRecords.value = recordsResult.value.filter(
        (record) =>
          record.record.patientId === loadedPatient.id ||
          patientEncounterIds.has(record.record.encounterId)
      );
    } else {
      registerWarning('prontuário');
    }

    if (ownerResult.status === 'fulfilled') {
      ownerName.value = ownerResult.value;
    } else {
      registerWarning('tutor principal');
    }

    if (ownerSnapshotResult.status === 'fulfilled') {
      ownerSnapshot.value = ownerSnapshotResult.value;
    } else {
      registerWarning('snapshot do tutor');
    }

    if (ownerBillingResult.status === 'fulfilled') {
      ownerBillingRecords.value = ownerBillingResult.value.filter(
        (record) => record.ownerId === loadedPatient.primaryOwnerId
      );
    } else {
      registerWarning('financeiro do tutor');
    }

    if (ownerQuotesResult.status === 'fulfilled') {
      ownerQuotes.value = ownerQuotesResult.value.filter(
        (quote) => quote.ownerId === loadedPatient.primaryOwnerId
      );
    } else {
      registerWarning('orçamentos do tutor');
    }

    const selectedEncounter = activeEncounters.value[0] ?? sortedEncounters.value[0] ?? null;
    if (!selectedEncounter) {
      return;
    }

    const hasRecord = patientRecords.value.some(
      (record) => record.record.encounterId === selectedEncounter.id
    );

    const [encounterTimelineResult, triageResult, inpatientResult, billingResult] =
      await Promise.allSettled([
        encounterService.getTimeline(selectedEncounter.id),
        listTriageRecords(selectedEncounter.id),
        inpatientService.list(selectedEncounter.id),
        billingService.list(selectedEncounter.id)
      ]);

    let entriesResult: PromiseSettledResult<ClinicalEntrySummary[]> | undefined;
    let clinicalTimelineResult: PromiseSettledResult<ClinicalTimelineEventSummary[]> | undefined;

    if (hasRecord) {
      [entriesResult, clinicalTimelineResult] = await Promise.allSettled([
        medicalRecordsService.listEntries(selectedEncounter.id),
        medicalRecordsService.getTimeline(selectedEncounter.id)
      ] as const);
    }

    if (encounterTimelineResult?.status === 'fulfilled') {
      focalEncounterTimeline.value = encounterTimelineResult.value;
    } else if (encounterTimelineResult) {
      registerWarning('timeline do atendimento');
    }

    if (triageResult?.status === 'fulfilled') {
      focalTriage.value = triageResult.value[0] ?? null;
    } else if (triageResult) {
      registerWarning('triagem');
    }

    if (inpatientResult?.status === 'fulfilled') {
      focalInpatientStay.value = inpatientResult.value[0] ?? null;
    } else if (inpatientResult) {
      registerWarning('internação');
    }

    if (billingResult?.status === 'fulfilled') {
      focalBilling.value = billingResult.value[0] ?? null;
    } else if (billingResult) {
      registerWarning('financeiro');
    }

    if (entriesResult?.status === 'fulfilled') {
      focalRecordEntries.value = entriesResult.value;
    } else if (entriesResult) {
      registerWarning('entradas clínicas');
    }

    if (clinicalTimelineResult?.status === 'fulfilled') {
      focalClinicalTimeline.value = clinicalTimelineResult.value;
    } else if (clinicalTimelineResult) {
      registerWarning('timeline do prontuário');
    }
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'Falha ao carregar paciente';
  } finally {
    loading.value = false;
  }
}

watch(
  patientId,
  () => {
    void loadPage();
  },
  { immediate: true }
);
</script>

<style scoped>
.patient-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-loading__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.patient-summary-grid,
.patient-workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item__label {
  color: #6b7280;
  font-size: 0.875rem;
}

.workspace-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.workspace-highlight {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
}

.entry-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
}

.entry-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.entry-metric__value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
}

.entry-metric__label {
  font-size: 0.8125rem;
  color: #6b7280;
}

.info-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-left: 4px solid #2563eb;
  border-radius: 10px;
  background: #eff6ff;
  color: #1e3a8a;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 0.8125rem;
  font-weight: 600;
}

.tag--neutral {
  background: #e5e7eb;
  color: #374151;
}

.timeline-list,
.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-list__item,
.record-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.timeline-list__item:last-child,
.record-list__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.timeline-list__item p,
.record-list__item p {
  margin: 4px 0 0;
  color: #6b7280;
}

.timeline-list__item--stacked {
  align-items: flex-start;
}

.record-list__item--stacked {
  align-items: flex-start;
}

.timeline-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 132px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #4b5563;
}

.empty-state p,
.muted {
  margin: 0;
  color: #6b7280;
}

@media (max-width: 720px) {
  .workspace-highlight,
  .timeline-list__item,
  .record-list__item {
    flex-direction: column;
    align-items: flex-start;
  }

  .timeline-list__meta {
    align-items: flex-start;
    min-width: auto;
  }
}
</style>
