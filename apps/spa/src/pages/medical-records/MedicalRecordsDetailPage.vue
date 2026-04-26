<template>
  <div class="medical-records-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div class="page-loading__stack">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    </div>

    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <template v-else-if="record">
      <AppPageHeader :breadcrumbs="['Atendimento', 'Atendimentos', 'Prontuário Clínico', patientName || 'Detalhes']">
        <template #title>Prontuário Clínico</template>
        <template #subtitle>
          <StatusBadge
            :label="record.status === 'open' ? 'Aberto' : 'Concluído'"
            :variant="record.status === 'open' ? 'warning' : 'success'"
          />
          <span class="muted">Paciente: {{ patientName }}</span>
        </template>
        <template #actions>
          <DsButton variant="primary" tag="a" :to="`/encounters/${record.encounterId}`">Abrir atendimento</DsButton>
          <DsButton variant="secondary" tag="a" :to="`/billing/${record.encounterId}`">Comanda</DsButton>
          <DsButton variant="secondary" tag="a" :to="`/patients/${record.patientId}`">Ver paciente</DsButton>
          <DsButton variant="secondary" @click="showNewEntryModal = true">Nova Entrada</DsButton>
          <DsButton variant="ghost" tag="a" to="/medical-records">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <DsAlert v-if="entryFormError" variant="danger" dismissible @dismiss="entryFormError = ''">
        {{ entryFormError }}
      </DsAlert>
      <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
        {{ successMessage }}
      </DsAlert>
      <DsAlert v-if="contextWarnings.length" variant="info" dismissible>
        Visão parcial: {{ contextWarnings.join(', ') }}.
      </DsAlert>

      <section class="record-cockpit" aria-label="Cockpit clínico do atendimento">
        <aside class="patient-rail">
          <div class="patient-rail__identity">
            <span class="patient-rail__avatar" aria-hidden="true">🐾</span>
            <div>
              <span class="patient-rail__eyebrow">Paciente em atendimento</span>
              <strong>{{ patientName || 'Paciente em carregamento' }}</strong>
              <span>{{ ownerName || 'Tutor em carregamento' }}</span>
            </div>
          </div>

          <div class="rail-section">
            <h2>Ficha do animal</h2>
            <dl class="detail-list">
              <div>
                <dt>ID</dt>
                <dd>{{ patient?.id || record.patientId }}</dd>
              </div>
              <div>
                <dt>Espécie</dt>
                <dd>{{ patient?.species || 'Não informada' }}</dd>
              </div>
              <div>
                <dt>Raça</dt>
                <dd>{{ patient?.breed || 'Não informada' }}</dd>
              </div>
              <div>
                <dt>Sexo</dt>
                <dd>{{ patient ? sexLabel(patient.sex) : 'Não informado' }}</dd>
              </div>
              <div>
                <dt>Peso base</dt>
                <dd>{{ currentWeightLabel }}</dd>
              </div>
              <div>
                <dt>Cadastro</dt>
                <dd>{{ patient?.createdAt ? formatDate(patient.createdAt) : 'Não informado' }}</dd>
              </div>
            </dl>
          </div>

          <div class="rail-section rail-section--warning">
            <h2>Segurança clínica</h2>
            <dl class="detail-list">
              <div>
                <dt>Doença crônica</dt>
                <dd>Não informado</dd>
              </div>
              <div>
                <dt>Alergia</dt>
                <dd>Não informado</dd>
              </div>
              <div>
                <dt>Temperamento</dt>
                <dd>Não informado</dd>
              </div>
            </dl>
          </div>

          <div class="rail-section">
            <h2>Cliente</h2>
            <dl class="detail-list">
              <div>
                <dt>Tutor</dt>
                <dd>{{ ownerName || 'Não informado' }}</dd>
              </div>
              <div>
                <dt>Contato</dt>
                <dd>{{ ownerPrimaryContact }}</dd>
              </div>
              <div>
                <dt>Documento</dt>
                <dd>{{ owner?.documentId || 'Não informado' }}</dd>
              </div>
            </dl>
            <div class="rail-actions">
              <DsButton v-if="owner" size="sm" variant="secondary" tag="a" :to="`/owners/${owner.id}`">
                Ver cadastro do cliente
              </DsButton>
            </div>
          </div>
        </aside>

        <main class="clinical-workbench">
          <section class="summary-strip" aria-label="Resumo do prontuário">
            <article v-for="card in summaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </article>
          </section>

          <section class="clinical-sheet" aria-label="Ficha de atendimento">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">Ficha de atendimento</span>
                <h2>Registro clínico estruturado</h2>
              </div>
              <div class="section-heading__actions">
                <DsButton variant="secondary" :disabled="submittingClinicalSheet" @click="clearClinicalSheet">
                  Limpar
                </DsButton>
                <DsButton
                  variant="primary"
                  :loading="submittingClinicalSheet"
                  :disabled="!hasClinicalSheetContent || submittingClinicalSheet"
                  @click="saveClinicalSheet"
                >
                  Salvar ficha de atendimento
                </DsButton>
              </div>
            </div>

            <div v-if="encounter" class="chief-complaint">
              <span>Queixa principal / motivo de abertura</span>
              <strong>{{ encounter.reason }}</strong>
            </div>

            <div class="clinical-form-grid">
              <label v-for="section in clinicalSheetSections" :key="section.key" class="clinical-field">
                <span>{{ section.label }}</span>
                <small>{{ section.hint }}</small>
                <textarea
                  v-model="clinicalSheet[section.key]"
                  :placeholder="section.placeholder"
                  :data-testid="`clinical-${section.key}`"
                  rows="5"
                ></textarea>
              </label>
            </div>
          </section>

          <section class="vetus-card-grid" aria-label="Resumo clínico Vetus-like">
            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Últimos Atendimentos</h3>
                <DsButton size="sm" variant="secondary" tag="a" :to="`/encounters/${record.encounterId}`">
                  Ver Atendimento
                </DsButton>
              </div>
              <div v-if="encounter" class="record-list">
                <div class="record-list__item">
                  <div>
                    <strong>{{ encounter.reason }}</strong>
                    <p>{{ encounterStatusLabel(encounter.status) }}</p>
                  </div>
                  <span>{{ formatDateTime(encounter.openedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Atendimento não carregado.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Anamneses</h3>
                <DsButton size="sm" variant="secondary" @click="startEntry('anamnesis')">
                  Incluir Nova Anamnese
                </DsButton>
              </div>
              <div v-if="anamnesisEntries.length" class="record-list">
                <div v-for="entry in anamnesisEntries.slice(0, 3)" :key="entry.id" class="record-list__item">
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entry.content }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Esse animal ainda não possui anamneses registradas.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Exames</h3>
                <DsButton size="sm" variant="secondary" tag="a" :to="`/diagnostics?encounter=${record.encounterId}`">
                  Ver mais Exames
                </DsButton>
              </div>
              <div v-if="diagnosticEntries.length" class="record-list">
                <div v-for="entry in diagnosticEntries.slice(0, 3)" :key="entry.id" class="record-list__item">
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entryTypeLabel(entry.entryType) }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Esse animal não possui exames registrados.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Receituário</h3>
                <DsButton size="sm" variant="secondary" @click="startEntry('prescription')">
                  Incluir Nova Receita
                </DsButton>
              </div>
              <div v-if="prescriptionEntries.length" class="record-list">
                <div v-for="entry in prescriptionEntries.slice(0, 3)" :key="entry.id" class="record-list__item">
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entry.content }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Esse animal não possui receitas registradas.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Comanda</h3>
                <DsButton size="sm" variant="secondary" tag="a" :to="`/billing/${record.encounterId}`">
                  Abrir Comanda
                </DsButton>
              </div>
              <dl class="detail-list">
                <div>
                  <dt>Status</dt>
                  <dd>{{ billingRecord ? billingStatusLabel(billingRecord.status) : 'Não aberta' }}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{{ formatCurrency(billingRecord?.subtotalAmount ?? 0, billingRecord?.currency ?? 'BRL') }}</dd>
                </div>
                <div>
                  <dt>Últimos lançamentos</dt>
                  <dd>{{ billingItems.length }}</dd>
                </div>
              </dl>
              <div v-if="billingItems.length" class="record-list record-list--compact">
                <div v-for="item in billingItems.slice(0, 3)" :key="item.id" class="record-list__item">
                  <div>
                    <strong>{{ item.description }}</strong>
                    <p>{{ item.quantity }} x {{ formatCurrency(item.unitPriceAmount, billingRecord?.currency ?? 'BRL') }}</p>
                  </div>
                  <span>{{ formatCurrency(item.totalAmount, billingRecord?.currency ?? 'BRL') }}</span>
                </div>
              </div>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Histórico Clinico</h3>
                <DsButton size="sm" variant="secondary" @click="startEntry('progress_note')">
                  Nova Evolução
                </DsButton>
              </div>
              <div v-if="activeEntries.length" class="record-list">
                <div v-for="entry in activeEntries.slice(0, 5)" :key="entry.id" class="record-list__item">
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entryTypeLabel(entry.entryType) }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Escreva aqui o histórico clínico do animal usando a ficha de atendimento.</p>
            </article>
          </section>

          <section class="clinical-history-grid">
            <AppDetailSection title="Entradas Clínicas">
              <div v-if="entries.length === 0" class="muted">
                Nenhuma entrada clínica registrada ainda. Use a ficha estruturada acima para documentar anamnese, exame físico, avaliação, plano e conduta.
              </div>

              <div v-else class="entries-list">
                <div
                  v-for="entry in activeEntries"
                  :key="entry.id"
                  class="entry-card"
                  :class="{ 'entry-card--archived': entry.deletedAt }"
                >
                  <div class="entry-card__header">
                    <span class="entry-card__type">{{ entryTypeLabel(entry.entryType) }}</span>
                    <span class="entry-card__version">v{{ entry.version }}</span>
                    <span class="entry-card__date">{{ formatDateTime(entry.createdAt) }}</span>
                  </div>
                  <h3 class="entry-card__title">{{ entry.title }}</h3>
                  <p class="entry-card__content">{{ entry.content }}</p>
                  <div class="entry-card__footer">
                    <span class="muted">Por: {{ entry.authoredByUserId.slice(0, 8) }}...</span>
                    <div class="entry-card__actions">
                      <DsButton
                        v-if="!entry.deletedAt"
                        size="sm"
                        variant="secondary"
                        @click="openEditEntry(entry)"
                      >
                        Editar
                      </DsButton>
                      <DsButton
                        v-if="!entry.deletedAt"
                        size="sm"
                        variant="danger"
                        @click="openArchiveEntry(entry)"
                      >
                        Arquivar
                      </DsButton>
                    </div>
                  </div>
                  <div v-if="entry.deletedAt" class="entry-card__archived">
                    Arquivado em {{ formatDate(entry.deletedAt) }}
                    <span v-if="entry.deleteReason"> - Motivo: {{ entry.deleteReason }}</span>
                  </div>
                </div>
              </div>
            </AppDetailSection>

            <AppDetailSection title="Timeline Clínica">
              <div v-if="timelineLoading" class="muted">Carregando timeline...</div>
              <div v-else-if="timeline.length === 0" class="muted">Nenhum evento registrado ainda neste prontuário.</div>
              <div v-else class="timeline-list">
                <div v-for="event in timeline" :key="event.id" class="timeline-event">
                  <span class="timeline-event__type">{{ timelineEventTypeLabel(event.eventType) }}</span>
                  <span class="timeline-event__summary">{{ event.summary }}</span>
                  <span class="timeline-event__time">{{ formatDateTime(event.occurredAt) }}</span>
                </div>
              </div>
            </AppDetailSection>
          </section>
        </main>
      </section>
    </template>

    <DsModal
      :open="showNewEntryModal || showEditEntryModal"
      :teleport="false"
      :title="editingEntry ? 'Editar Entrada' : 'Nova Entrada Clínica'"
      size="lg"
      @close="closeEntryModal"
    >
      <DsAlert v-if="entryFormError" variant="danger">{{ entryFormError }}</DsAlert>

      <DsInput id="entryType" v-model="entryForm.entryType" type="select" label="Tipo" required>
        <option value="anamnesis">Anamnese</option>
        <option value="physical_exam">Exame Físico</option>
        <option value="progress_note">Nota de Evolução</option>
        <option value="assessment">Avaliação</option>
        <option value="plan">Plano</option>
        <option value="prescription">Prescrição</option>
        <option value="conduct">Conduta</option>
      </DsInput>

      <DsInput
        id="entryTitle"
        v-model="entryForm.title"
        label="Título"
        placeholder="Título da entrada"
        required
      />

      <DsInput
        id="entryContent"
        v-model="entryForm.content"
        type="textarea"
        label="Conteúdo"
        placeholder="Conteúdo clínico..."
        :rows="8"
        required
      />

      <DsInput
        v-if="editingEntry"
        id="editReason"
        v-model="editReason"
        label="Motivo da Edição"
        placeholder="Motivo da alteração..."
      />

      <template #footer>
        <DsButton variant="secondary" @click="closeEntryModal">Cancelar</DsButton>
        <DsButton
          variant="primary"
          :disabled="!isEntryFormValid || submittingEntry"
          @click="handleSaveEntry"
        >
          {{ submittingEntry ? 'Salvando...' : 'Salvar' }}
        </DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="showArchiveModal"
      :teleport="false"
      title="Arquivar Entrada"
      @close="showArchiveModal = false"
    >
      <DsInput
        id="archiveReason"
        v-model="archiveReason"
        type="textarea"
        label="Motivo"
        placeholder="Motivo do arquivamento..."
        :rows="3"
        required
      />

      <template #footer>
        <DsButton variant="secondary" @click="showArchiveModal = false">Cancelar</DsButton>
        <DsButton
          variant="danger"
          :disabled="!archiveReason.trim() || archivingEntry"
          @click="handleArchiveEntry"
        >
          {{ archivingEntry ? 'Arquivando...' : 'Arquivar' }}
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { billingService } from '@/services/billing';
import { diagnosticsService } from '@/services/diagnostics';
import { encounterService } from '@/services/encounter';
import { medicalRecordsService } from '@/services/medicalRecords';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { prescriptionsService } from '@/services/prescriptions';
import type { BillingItemSummary, BillingRecordSummary, BillingStatus } from '@/types/billing';
import type { EncounterSummary } from '@/types/encounter';
import type {
  ArchiveClinicalEntryRequest,
  ClinicalEntrySummary,
  ClinicalEntryType,
  ClinicalTimelineEventSummary,
  CreateClinicalEntryRequest,
  MedicalRecordSummary,
  UpdateClinicalEntryRequest
} from '@/types/medicalRecords';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSex, PatientSummary } from '@/types/patient';
import { useEntityCache } from '@/composables/useEntityCache';
import {
  encounterStatusLabel,
  formatDateTime as formatEncounterDateTime
} from '@/utils/labels';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

type ClinicalSheetKey = 'anamnesis' | 'physicalExam' | 'assessment' | 'plan' | 'prescription' | 'conduct';

interface ClinicalSheetSection {
  key: ClinicalSheetKey;
  entryType: ClinicalEntryType;
  label: string;
  title: string;
  hint: string;
  placeholder: string;
}

const route = useRoute();
const routeRecordId = String(route.params.id ?? '');
const entityCache = useEntityCache();

const record = ref<MedicalRecordSummary | null>(null);
const entries = ref<ClinicalEntrySummary[]>([]);
const timeline = ref<ClinicalTimelineEventSummary[]>([]);
const encounter = ref<EncounterSummary | null>(null);
const patient = ref<PatientSummary | null>(null);
const owner = ref<OwnerSummary | null>(null);
const billingRecord = ref<BillingRecordSummary | null>(null);
const billingItems = ref<BillingItemSummary[]>([]);
const patientPrescriptions = ref<ClinicalEntrySummary[]>([]);
const diagnosticEntries = ref<ClinicalEntrySummary[]>([]);
const contextWarnings = ref<string[]>([]);
const resolvedEncounterId = ref('');
const loading = ref(true);
const timelineLoading = ref(false);
const error = ref('');
const patientName = ref('');
const ownerName = ref('');
const successMessage = ref('');

const showNewEntryModal = ref(false);
const showEditEntryModal = ref(false);
const showArchiveModal = ref(false);
const submittingEntry = ref(false);
const submittingClinicalSheet = ref(false);
const archivingEntry = ref(false);
const entryFormError = ref('');
const editingEntry = ref<ClinicalEntrySummary | null>(null);
const editReason = ref('');
const archiveReason = ref('');
const archiveTarget = ref<ClinicalEntrySummary | null>(null);

const entryForm = ref({
  entryType: 'progress_note' as ClinicalEntryType,
  title: '',
  content: ''
});

const clinicalSheet = reactive<Record<ClinicalSheetKey, string>>({
  anamnesis: '',
  physicalExam: '',
  assessment: '',
  plan: '',
  prescription: '',
  conduct: ''
});

const clinicalSheetSections: ClinicalSheetSection[] = [
  {
    key: 'anamnesis',
    entryType: 'anamnesis',
    label: 'Anamnese / relato do tutor',
    title: 'Anamnese',
    hint: 'História, sinais percebidos, evolução e contexto informado pelo tutor.',
    placeholder: 'Ex.: início dos sinais, apetite, ingestão hídrica, vômitos, diarreia, comportamento, medicações em uso.'
  },
  {
    key: 'physicalExam',
    entryType: 'physical_exam',
    label: 'Exame físico',
    title: 'Exame físico',
    hint: 'Achados objetivos do atendimento.',
    placeholder: 'Ex.: TPC, mucosas, hidratação, ausculta, palpação, temperatura, dor, pele, olhos, cavidade oral.'
  },
  {
    key: 'assessment',
    entryType: 'assessment',
    label: 'Avaliação / hipóteses',
    title: 'Avaliação clínica',
    hint: 'Raciocínio diagnóstico, problemas ativos e exames necessários.',
    placeholder: 'Ex.: principais suspeitas, diferenciais, gravidade, exames solicitados e justificativa.'
  },
  {
    key: 'plan',
    entryType: 'plan',
    label: 'Plano terapêutico',
    title: 'Plano terapêutico',
    hint: 'Conduta planejada para o caso.',
    placeholder: 'Ex.: medicações, fluidoterapia, exames complementares, retorno, internação, orientações de monitoramento.'
  },
  {
    key: 'prescription',
    entryType: 'prescription',
    label: 'Receituário',
    title: 'Receituário',
    hint: 'Prescrições emitidas ou ajustadas no atendimento.',
    placeholder: 'Ex.: medicamento, dose, via, frequência, duração, observações e restrições.'
  },
  {
    key: 'conduct',
    entryType: 'conduct',
    label: 'Conduta / orientações finais',
    title: 'Conduta e orientações',
    hint: 'Fechamento clínico e comunicação ao tutor.',
    placeholder: 'Ex.: orientações ao tutor, sinais de alerta, retorno recomendado, pendências e acompanhamento.'
  }
];

const activeEntries = computed(() => entries.value.filter((entry) => !entry.deletedAt));
const archivedEntries = computed(() => entries.value.filter((entry) => !!entry.deletedAt).length);
const timelineCount = computed(() => timeline.value.length);
const anamnesisEntries = computed(() => activeEntries.value.filter((entry) => entry.entryType === 'anamnesis'));
const prescriptionEntries = computed(() => {
  const ownEntries = activeEntries.value.filter((entry) => entry.entryType === 'prescription');
  const byId = new Map([...ownEntries, ...patientPrescriptions.value].map((entry) => [entry.id, entry]));
  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

const hasClinicalSheetContent = computed(() =>
  clinicalSheetSections.some((section) => clinicalSheet[section.key].trim().length > 0)
);

const summaryCards = computed(() => {
  if (!record.value) return [];
  return [
    { label: 'Paciente', value: patientName.value || '-', hint: 'Identificação clínica' },
    {
      label: 'Status',
      value: record.value.status === 'open' ? 'Aberto' : 'Concluído',
      hint: 'Situação operacional'
    },
    { label: 'Entradas', value: activeEntries.value.length.toString(), hint: 'Entradas ativas' },
    { label: 'Arquivadas', value: archivedEntries.value.toString(), hint: 'Entradas retiradas' },
    { label: 'Timeline', value: timelineCount.value.toString(), hint: 'Eventos rastreados' },
    { label: 'Comanda', value: billingRecord.value ? billingStatusLabel(billingRecord.value.status) : 'Não aberta', hint: 'Últimos lançamentos' }
  ];
});

const ownerPrimaryContact = computed(() => {
  const contacts = owner.value?.contacts ?? [];
  const primary = contacts.find((contact) => contact.primary) ?? contacts[0];
  return primary ? `${primary.label}: ${primary.value}` : 'Não informado';
});

const currentWeightLabel = computed(() => {
  if (!patient.value?.baseWeightKg) return 'Não informado';
  return `${patient.value.baseWeightKg.toLocaleString('pt-BR')} kg`;
});

const isEntryFormValid = computed(() => entryForm.value.title.trim() && entryForm.value.content.trim());

const entryTypeMap: Record<ClinicalEntryType, string> = {
  anamnesis: 'Anamnese',
  physical_exam: 'Exame Físico',
  progress_note: 'Nota de Evolução',
  assessment: 'Avaliação',
  plan: 'Plano',
  prescription: 'Prescrição',
  conduct: 'Conduta'
};

const timelineEventTypeMap: Record<string, string> = {
  record_created: 'Prontuário criado',
  entry_added: 'Entrada adicionada',
  entry_updated: 'Entrada atualizada',
  entry_archived: 'Entrada arquivada',
  attachment_added: 'Anexo adicionado',
  inpatient_admitted: 'Internação iniciada',
  inpatient_progressed: 'Evolução de internação',
  diagnostic_requested: 'Exame solicitado',
  diagnostic_collected: 'Coleta registrada',
  diagnostic_resulted: 'Resultado liberado'
};

function entryTypeLabel(type: ClinicalEntryType) {
  return entryTypeMap[type] || type;
}

function timelineEventTypeLabel(type: string) {
  return timelineEventTypeMap[type] || type;
}

function sexLabel(sex: PatientSex) {
  const labels: Record<PatientSex, string> = {
    male: 'Macho',
    female: 'Fêmea',
    unknown: 'Não informado'
  };
  return labels[sex] || sex;
}

function billingStatusLabel(status: BillingStatus) {
  const labels: Record<BillingStatus, string> = {
    draft: 'Rascunho',
    estimated: 'Orçada',
    open: 'Aberta',
    settled: 'Fechada'
  };
  return labels[status] || status;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(value);
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch {
    return date;
  }
}

function formatDateTime(date: string) {
  try {
    return formatEncounterDateTime(date);
  } catch {
    return date;
  }
}

function startEntry(entryType: ClinicalEntryType) {
  const section = clinicalSheetSections.find((item) => item.entryType === entryType);
  entryForm.value = {
    entryType,
    title: section?.title ?? entryTypeLabel(entryType),
    content: ''
  };
  editingEntry.value = null;
  editReason.value = '';
  showNewEntryModal.value = true;
}

function openEditEntry(entry: ClinicalEntrySummary) {
  editingEntry.value = entry;
  entryForm.value = {
    entryType: entry.entryType,
    title: entry.title,
    content: entry.content
  };
  editReason.value = '';
  showEditEntryModal.value = true;
}

function openArchiveEntry(entry: ClinicalEntrySummary) {
  archiveTarget.value = entry;
  archiveReason.value = '';
  showArchiveModal.value = true;
}

function closeEntryModal() {
  showNewEntryModal.value = false;
  showEditEntryModal.value = false;
  editingEntry.value = null;
  entryForm.value = { entryType: 'progress_note', title: '', content: '' };
  entryFormError.value = '';
  editReason.value = '';
}

function clearClinicalSheet() {
  for (const section of clinicalSheetSections) {
    clinicalSheet[section.key] = '';
  }
}

async function loadRecord() {
  try {
    const response = await loadRecordByRouteId(routeRecordId);
    record.value = response.record;
    entries.value = response.entries;
    resolvedEncounterId.value = response.record.encounterId;
    patientName.value = await entityCache.getPatientName(response.record.patientId);
    await loadClinicalContext(response.record);
  } catch (err: unknown) {
    error.value = getLoadRecordErrorMessage(err);
  }
}

function getLoadRecordErrorMessage(err: unknown) {
  if (!(err instanceof Error)) {
    return 'Erro ao carregar prontuário';
  }

  if (err.message === 'Unexpected error') {
    return 'Não foi possível carregar este prontuário. Tente voltar para a lista e abrir o atendimento novamente.';
  }

  return err.message;
}

async function loadRecordByRouteId(id: string) {
  try {
    return await medicalRecordsService.getByEncounter(id);
  } catch (err: unknown) {
    if (!(err instanceof Error) || err.message !== 'Unexpected error') {
      throw err;
    }

    const records = await medicalRecordsService.listAll();
    const matchedRecord = records.find(
      (item) => item.record.id === id || item.record.encounterId === id
    )?.record;

    if (!matchedRecord) {
      throw new Error('Prontuário não encontrado para este identificador.');
    }

    return {
      record: matchedRecord,
      entries: await medicalRecordsService.listEntries(matchedRecord.encounterId)
    };
  }
}

async function loadClinicalContext(currentRecord: MedicalRecordSummary) {
  contextWarnings.value = [];
  const [encounterResult, patientResult, billingResult, billingItemsResult, diagnosticsResult, prescriptionsResult] =
    await Promise.allSettled([
      encounterService.getById(currentRecord.encounterId),
      patientService.getById(currentRecord.patientId),
      billingService.getByEncounter(currentRecord.encounterId),
      billingService.listItems(currentRecord.encounterId),
      diagnosticsService.listByEncounter(currentRecord.encounterId),
      prescriptionsService.listByPatient(currentRecord.patientId)
    ]);

  if (encounterResult.status === 'fulfilled') {
    encounter.value = encounterResult.value;
    ownerName.value = await entityCache.getOwnerName(encounterResult.value.ownerId);
  } else {
    contextWarnings.value.push('atendimento');
  }

  if (patientResult.status === 'fulfilled') {
    patient.value = patientResult.value;
  } else {
    contextWarnings.value.push('paciente');
  }

  const ownerId = encounter.value?.ownerId ?? patient.value?.primaryOwnerId;
  if (ownerId) {
    try {
      owner.value = await ownerService.getById(ownerId);
      ownerName.value = owner.value.fullName;
    } catch {
      contextWarnings.value.push('cliente');
    }
  }

  if (billingResult.status === 'fulfilled') {
    billingRecord.value = billingResult.value;
  } else {
    billingRecord.value = null;
  }

  billingItems.value = billingItemsResult.status === 'fulfilled' ? billingItemsResult.value : [];
  diagnosticEntries.value = diagnosticsResult.status === 'fulfilled' ? diagnosticsResult.value : [];
  patientPrescriptions.value = prescriptionsResult.status === 'fulfilled' ? prescriptionsResult.value : [];
}

async function loadTimeline() {
  timelineLoading.value = true;
  try {
    if (!resolvedEncounterId.value) {
      timeline.value = [];
      return;
    }

    timeline.value = await medicalRecordsService.getTimeline(resolvedEncounterId.value);
  } catch {
    timeline.value = [];
  } finally {
    timelineLoading.value = false;
  }
}

async function refreshRecordAndTimeline() {
  await loadRecord();
  await loadTimeline();
}

async function saveClinicalSheet() {
  if (!record.value || !hasClinicalSheetContent.value) return;
  submittingClinicalSheet.value = true;
  entryFormError.value = '';
  successMessage.value = '';

  try {
    const payloads = clinicalSheetSections
      .map((section) => ({
        section,
        content: clinicalSheet[section.key].trim()
      }))
      .filter((item) => item.content.length > 0);

    for (const item of payloads) {
      await medicalRecordsService.createEntry({
        encounterId: record.value.encounterId,
        patientId: record.value.patientId,
        entryType: item.section.entryType,
        title: item.section.title,
        content: item.content
      });
    }

    clearClinicalSheet();
    successMessage.value = 'Ficha de atendimento salva no prontuário.';
    await refreshRecordAndTimeline();
  } catch (err: unknown) {
    entryFormError.value = err instanceof Error ? err.message : 'Erro ao salvar ficha de atendimento';
  } finally {
    submittingClinicalSheet.value = false;
  }
}

async function handleSaveEntry() {
  if (!record.value || !isEntryFormValid.value) return;
  submittingEntry.value = true;
  entryFormError.value = '';
  successMessage.value = '';

  try {
    if (editingEntry.value) {
      const payload: UpdateClinicalEntryRequest = {
        title: entryForm.value.title.trim(),
        content: entryForm.value.content.trim(),
        reason: editReason.value.trim() || undefined,
        expectedVersion: editingEntry.value.version
      };
      await medicalRecordsService.updateEntry(editingEntry.value.id, payload);
    } else {
      const payload: CreateClinicalEntryRequest = {
        encounterId: record.value.encounterId,
        patientId: record.value.patientId,
        entryType: entryForm.value.entryType,
        title: entryForm.value.title.trim(),
        content: entryForm.value.content.trim()
      };
      await medicalRecordsService.createEntry(payload);
    }
    closeEntryModal();
    successMessage.value = 'Entrada clínica salva no prontuário.';
    await refreshRecordAndTimeline();
  } catch (err: unknown) {
    entryFormError.value = err instanceof Error ? err.message : 'Erro ao salvar entrada';
  } finally {
    submittingEntry.value = false;
  }
}

async function handleArchiveEntry() {
  if (!archiveTarget.value || !archiveReason.value.trim()) return;
  archivingEntry.value = true;

  try {
    const payload: ArchiveClinicalEntryRequest = {
      reason: archiveReason.value.trim(),
      expectedVersion: archiveTarget.value.version
    };
    await medicalRecordsService.archiveEntry(archiveTarget.value.id, payload);
    showArchiveModal.value = false;
    archiveTarget.value = null;
    archiveReason.value = '';
    await refreshRecordAndTimeline();
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao arquivar entrada');
  } finally {
    archivingEntry.value = false;
  }
}

onMounted(async () => {
  try {
    await loadRecord();
    await loadTimeline();
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-loading__stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.record-cockpit {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.patient-rail,
.clinical-sheet,
.vetus-card,
.summary-card {
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.patient-rail {
  display: grid;
  gap: 14px;
  padding: 14px;
  position: sticky;
  top: 84px;
}

.patient-rail__identity {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.patient-rail__avatar {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
  font-size: 22px;
}

.patient-rail__eyebrow,
.section-heading__eyebrow,
.summary-card__label,
.detail-list dt {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.patient-rail__identity strong {
  display: block;
  color: var(--color-text, #0f172a);
  font-size: 18px;
}

.patient-rail__identity span:last-child {
  display: block;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.rail-section {
  display: grid;
  gap: 10px;
}

.rail-section h2,
.section-heading h2,
.vetus-card h3 {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 16px;
}

.rail-section--warning {
  padding: 10px;
  border-radius: 8px;
  background: var(--color-warning-50, #fffbeb);
}

.rail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-list {
  display: grid;
  gap: 8px;
  margin: 0;
}

.detail-list div {
  display: grid;
  grid-template-columns: minmax(86px, 0.8fr) minmax(0, 1fr);
  gap: 8px;
}

.detail-list dd {
  min-width: 0;
  margin: 0;
  color: var(--color-text, #0f172a);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.clinical-workbench {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 10px;
}

.summary-card {
  min-width: 0;
  padding: 12px;
}

.summary-card__value {
  display: block;
  margin-top: 4px;
  color: var(--color-text, #0f172a);
  font-size: 18px;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.summary-card__hint {
  display: block;
  margin-top: 3px;
  color: var(--color-text-secondary, #64748b);
  font-size: 12px;
}

.clinical-sheet {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.section-heading,
.vetus-card__header,
.entry-card__header,
.entry-card__footer,
.timeline-event,
.record-list__item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.section-heading__actions,
.entry-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.chief-complaint {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
  color: var(--color-text-secondary, #475569);
}

.chief-complaint strong {
  color: var(--color-text, #0f172a);
}

.clinical-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.clinical-field {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--color-text, #0f172a);
  font-weight: 800;
}

.clinical-field small {
  color: var(--color-text-secondary, #64748b);
  font-size: 12px;
  font-weight: 500;
}

.clinical-field textarea {
  width: 100%;
  min-width: 0;
  resize: vertical;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 8px;
  padding: 10px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
  line-height: 1.5;
}

.vetus-card-grid,
.clinical-history-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.vetus-card {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
}

.record-list,
.entries-list,
.timeline-list {
  display: grid;
  gap: 10px;
}

.record-list--compact {
  margin-top: 4px;
}

.record-list__item {
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.record-list__item div {
  min-width: 0;
}

.record-list__item strong,
.record-list__item p,
.record-list__item span {
  overflow-wrap: anywhere;
}

.record-list__item p {
  margin: 3px 0 0;
  color: var(--color-text-secondary, #64748b);
  font-size: 13px;
}

.record-list__item span {
  flex-shrink: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.entry-card {
  padding: 14px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--color-border, #e2e8f0);
}

.entry-card--archived {
  opacity: 0.6;
}

.entry-card__type {
  font-weight: 800;
  font-size: 13px;
  color: var(--color-primary-700, #1d4ed8);
}

.entry-card__version,
.entry-card__date,
.timeline-event__time {
  color: var(--color-text-muted, #94a3b8);
  font-size: 12px;
}

.entry-card__title {
  margin: 10px 0 8px;
  font-size: 15px;
  color: var(--color-text, #0f172a);
}

.entry-card__content {
  margin: 0 0 12px;
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.entry-card__archived {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  color: var(--color-text-muted, #94a3b8);
  font-size: 12px;
}

.timeline-event {
  padding: 10px 12px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
  font-size: 13px;
}

.timeline-event__type {
  flex-shrink: 0;
  font-weight: 800;
}

.timeline-event__summary {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 1180px) {
  .record-cockpit {
    grid-template-columns: 1fr;
  }

  .patient-rail {
    position: static;
  }
}

@media (max-width: 820px) {
  .clinical-form-grid,
  .vetus-card-grid,
  .clinical-history-grid {
    grid-template-columns: 1fr;
  }

  .section-heading,
  .vetus-card__header,
  .entry-card__header,
  .entry-card__footer,
  .timeline-event,
  .record-list__item {
    align-items: flex-start;
    flex-direction: column;
  }

  .section-heading__actions,
  .entry-card__actions {
    justify-content: flex-start;
  }
}
</style>
