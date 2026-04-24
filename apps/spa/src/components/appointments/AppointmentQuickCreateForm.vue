<template>
  <div class="appointment-quick-create" :class="{ 'appointment-quick-create--compact': compact }">
    <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
      {{ formError }}
    </DsAlert>

    <div class="appointment-quick-create__layout">
      <form class="appointment-quick-create__form" @submit.prevent="submit">
        <DsCard v-if="ownerSnapshot && lockOwnerSelection" title="Cliente selecionado">
          <div class="selected-client">
            <strong>{{ ownerSnapshot.fullName }}</strong>
            <span>{{ ownerSnapshot.documentId || 'Documento não informado' }}</span>
            <span>{{ ownerPrimaryContact }}</span>
          </div>
        </DsCard>

        <DsCard title="Tutor e paciente">
          <div v-if="!hideOwnerSelection" class="form-field">
            <label class="form-field__label" for="ownerId">Tutor</label>
            <SearchSelect
              id="ownerId"
              v-model="form.ownerId"
              :options="ownerOptions"
              :loading="ownersLoading"
              placeholder="Buscar tutor por nome..."
              @change="handleOwnerChange"
            />
            <span v-if="errors.ownerId" class="form-field__error">{{ errors.ownerId }}</span>
            <div class="inline-actions">
              <DsButton variant="secondary" size="sm" type="button" @click="showOwnerModal = true">
                Novo tutor inline
              </DsButton>
            </div>
          </div>

          <div class="form-field">
            <label class="form-field__label" for="patientId">Paciente</label>
            <SearchSelect
              id="patientId"
              v-model="form.patientId"
              :options="patientOptions"
              :loading="patientsLoading"
              :placeholder="
                form.ownerId ? 'Buscar paciente deste cliente...' : 'Buscar paciente por nome...'
              "
              @change="handlePatientChange"
            />
            <span v-if="errors.patientId" class="form-field__error">{{ errors.patientId }}</span>
            <div class="inline-actions">
              <DsButton
                variant="secondary"
                size="sm"
                type="button"
                :disabled="!form.ownerId"
                @click="openPatientInline"
              >
                Novo paciente inline
              </DsButton>
            </div>
          </div>
        </DsCard>

        <DsCard title="Horário e alocação">
          <div class="form-row">
            <DsInput
              id="scheduledAt"
              v-model="form.scheduledAt"
              type="datetime-local"
              label="Data e hora"
              required
              :error="errors.scheduledAt"
            />
            <DsInput
              id="durationMinutes"
              v-model.number="form.durationMinutes"
              type="number"
              min="10"
              step="5"
              label="Duração (min)"
            />
          </div>

          <div class="form-row form-row--3">
            <DsInput id="visitType" v-model="form.visitType" type="select" label="Tipo">
              <option value="scheduled">Agendado</option>
              <option value="walk_in">Walk-in</option>
              <option value="return">Retorno</option>
            </DsInput>
            <DsInput
              id="practitionerStaffId"
              v-model="form.practitionerStaffId"
              type="select"
              label="Profissional"
            >
              <option value="">Sem profissional</option>
              <option v-for="professional in professionals" :key="professional.id" :value="professional.id">
                {{ professional.fullName }} · {{ professional.jobTitle }}
              </option>
            </DsInput>
            <DsInput id="serviceId" v-model="form.serviceId" type="select" label="Serviço">
              <option value="">Sem serviço</option>
              <option v-for="service in services" :key="service.id" :value="service.id">
                {{ service.name }}
              </option>
            </DsInput>
          </div>

          <div class="form-row form-row--3">
            <DsInput id="unit" v-model="form.unit" label="Unidade/Setor" placeholder="Ex: Clínica" />
            <DsInput
              id="specialty"
              v-model="form.specialty"
              label="Especialidade"
              placeholder="Ex: Cardiologia"
            />
            <DsInput
              id="resourceLabel"
              v-model="form.resourceLabel"
              label="Sala/Recurso"
              placeholder="Ex: Consultório 2"
            />
          </div>
        </DsCard>

        <DsCard title="Contexto operacional">
          <DsInput
            id="reason"
            v-model="form.reason"
            type="textarea"
            label="Motivo"
            placeholder="Descreva o contexto do agendamento"
            :rows="3"
            :error="errors.reason"
            required
          />
        </DsCard>

        <div class="form-actions">
          <DsButton type="submit" variant="primary" :loading="submitting">
            {{ submitting ? 'Agendando...' : submitLabel }}
          </DsButton>
          <DsButton variant="secondary" type="button" @click="$emit('cancel')">Cancelar</DsButton>
        </div>
      </form>

      <div class="appointment-quick-create__aside">
        <DsCard title="Smart scheduling">
          <div v-if="recommendationLoading" class="availability-state">
            <DsSpinner size="sm" inline label="Calculando sugestão..." />
          </div>
          <p v-else-if="!canRecommendDuration" class="muted">
            Selecione paciente, horário e tipo para gerar uma recomendação de duração.
          </p>
          <template v-else-if="recommendation">
            <DsAlert :variant="recommendationApplied ? 'success' : 'info'">
              {{
                recommendationApplied
                  ? 'Sugestão aplicada ao agendamento.'
                  : 'Sugestão pronta para aplicação no slot.'
              }}
            </DsAlert>

            <div class="summary-list">
              <div class="summary-list__item">
                <span class="summary-list__label">Duração prevista</span>
                <strong>{{ recommendation.predictedDurationMinutes }} min</strong>
              </div>
              <div class="summary-list__item">
                <span class="summary-list__label">Confiança</span>
                <strong>{{ recommendationConfidenceLabel }}</strong>
              </div>
              <div class="summary-list__item">
                <span class="summary-list__label">Histórico base</span>
                <strong>{{ recommendation.historicalAverageMinutes }} min</strong>
              </div>
            </div>

            <div v-if="recommendation.factors.length" class="availability-list">
              <h4>Fatores considerados</h4>
              <ul>
                <li v-for="factor in recommendation.factors" :key="factor">{{ factor }}</li>
              </ul>
            </div>

            <div class="inline-actions inline-actions--start">
              <DsButton
                type="button"
                size="sm"
                variant="primary"
                :disabled="recommendationApplied"
                @click="applyRecommendation"
              >
                {{ recommendationApplied ? 'Sugestão aplicada' : 'Aplicar duração sugerida' }}
              </DsButton>
            </div>
          </template>
        </DsCard>

        <DsCard title="Disponibilidade">
          <div v-if="availabilityLoading" class="availability-state">
            <DsSpinner size="sm" inline label="Validando slot..." />
          </div>
          <p v-else-if="!canCheckAvailability" class="muted">
            Selecione tutor, paciente e horário para validar bloqueios e conflitos.
          </p>
          <template v-else-if="availability">
            <DsAlert :variant="availability.available ? 'success' : 'warning'">
              {{
                availability.available
                  ? 'Slot liberado para agendamento.'
                  : 'Há conflito ou bloqueio para o horário informado.'
              }}
            </DsAlert>

            <div class="summary-list">
              <div class="summary-list__item">
                <span class="summary-list__label">Janela</span>
                <strong>{{ formatRange(availability.requestedSlot.startsAt, availability.requestedSlot.endsAt) }}</strong>
              </div>
              <div class="summary-list__item">
                <span class="summary-list__label">Profissional</span>
                <strong>{{ selectedProfessionalLabel }}</strong>
              </div>
              <div class="summary-list__item">
                <span class="summary-list__label">Sala/Recurso</span>
                <strong>{{ form.resourceLabel.trim() || '—' }}</strong>
              </div>
            </div>

            <div v-if="availability.conflicts.length" class="availability-list">
              <h4>Conflitos</h4>
              <ul>
                <li v-for="conflict in availability.conflicts" :key="`${conflict.type}-${conflict.startsAt}-${conflict.endsAt}`">
                  {{ conflict.message }}
                </li>
              </ul>
            </div>

            <div v-if="availability.blocks.length" class="availability-list">
              <h4>Bloqueios operacionais</h4>
              <ul>
                <li v-for="block in availability.blocks" :key="block.id">
                  {{ block.title }} · {{ formatRange(block.startsAt, block.endsAt) }}
                </li>
              </ul>
            </div>

            <div v-if="availability.suggestions.length" class="availability-list">
              <h4>Próximos slots</h4>
              <div class="suggestions-grid">
                <button
                  v-for="slot in availability.suggestions"
                  :key="slot.startsAt"
                  type="button"
                  class="slot-chip"
                  :class="{ 'slot-chip--available': slot.available }"
                  @click="applySuggestion(slot.startsAt)"
                >
                  {{ formatRange(slot.startsAt, slot.endsAt) }}
                </button>
              </div>
            </div>
          </template>
        </DsCard>
      </div>
    </div>

    <DsModal :open="showOwnerModal" title="Novo tutor inline" size="sm" @close="closeOwnerModal">
      <div class="modal-form">
        <DsInput id="quick-owner-name" v-model="ownerDraft.fullName" label="Nome completo" required />
        <DsInput id="quick-owner-whatsapp" v-model="ownerDraft.whatsapp" label="WhatsApp" />
        <DsInput id="quick-owner-phone" v-model="ownerDraft.phone" label="Telefone" />
      </div>
      <template #footer>
        <DsButton variant="ghost" type="button" @click="closeOwnerModal">Cancelar</DsButton>
        <DsButton variant="primary" type="button" :loading="ownerSubmitting" @click="createInlineOwner">
          Salvar tutor
        </DsButton>
      </template>
    </DsModal>

    <DsModal :open="showPatientModal" title="Novo paciente inline" size="sm" @close="closePatientModal">
      <div class="modal-form">
        <DsInput id="quick-patient-name" v-model="patientDraft.name" label="Nome do paciente" required />
        <DsInput id="quick-patient-species" v-model="patientDraft.species" type="select" label="Espécie">
          <option value="canine">Canino</option>
          <option value="feline">Felino</option>
          <option value="avian">Ave</option>
          <option value="rodent">Roedor</option>
          <option value="reptile">Réptil</option>
          <option value="other">Outro</option>
        </DsInput>
        <DsInput id="quick-patient-sex" v-model="patientDraft.sex" type="select" label="Sexo">
          <option value="male">Macho</option>
          <option value="female">Fêmea</option>
          <option value="unknown">Desconhecido</option>
        </DsInput>
        <DsInput id="quick-patient-breed" v-model="patientDraft.breed" label="Raça" />
      </div>
      <template #footer>
        <DsButton variant="ghost" type="button" @click="closePatientModal">Cancelar</DsButton>
        <DsButton variant="primary" type="button" :loading="patientSubmitting" @click="createInlinePatient">
          Salvar paciente
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import SearchSelect from '@/components/SearchSelect.vue';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { appointmentService } from '@/services/appointment';
import { getSchedulingOverview } from '@/services/scheduling';
import { servicesService } from '@/services/services';
import type {
  AppointmentSummary,
  AppointmentVisitType,
  SchedulingAvailabilityResponse,
  SchedulingProfessionalSummary,
  SmartSchedulingRecommendationResponse
} from '@/types/appointment';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
import type { ServiceSummary } from '@/services/services';
import { speciesLabel } from '@/utils/labels';

interface Props {
  compact?: boolean;
  submitLabel?: string;
  presetOwnerId?: string;
  presetPatientId?: string;
  presetScheduledAt?: string;
  presetDurationMinutes?: number;
  presetPractitionerStaffId?: string;
  presetVisitType?: AppointmentVisitType;
  presetServiceId?: string;
  presetUnit?: string;
  presetSpecialty?: string;
  presetResourceLabel?: string;
  presetReason?: string;
  professionals?: SchedulingProfessionalSummary[];
  hideOwnerSelection?: boolean;
  lockOwnerSelection?: boolean;
  restrictPatientsToOwner?: boolean;
  ownerSnapshot?: OwnerSummary | null;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  submitLabel: 'Salvar agendamento',
  presetOwnerId: '',
  presetPatientId: '',
  presetScheduledAt: '',
  presetDurationMinutes: 30,
  presetPractitionerStaffId: '',
  presetVisitType: 'scheduled',
  presetServiceId: '',
  presetUnit: '',
  presetSpecialty: '',
  presetResourceLabel: '',
  presetReason: '',
  hideOwnerSelection: false,
  lockOwnerSelection: false,
  restrictPatientsToOwner: false,
  ownerSnapshot: null
});

const emit = defineEmits<{
  created: [appointment: AppointmentSummary];
  cancel: [];
}>();

const owners = ref<OwnerSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const services = ref<ServiceSummary[]>([]);
const runtimeProfessionals = ref<SchedulingProfessionalSummary[]>([]);

const ownersLoading = ref(false);
const patientsLoading = ref(false);
const servicesLoading = ref(false);
const submitting = ref(false);
const availabilityLoading = ref(false);
const availability = ref<SchedulingAvailabilityResponse | null>(null);
const recommendationLoading = ref(false);
const recommendation = ref<SmartSchedulingRecommendationResponse | null>(null);
const formError = ref('');
const errors = reactive<Record<string, string>>({
  ownerId: '',
  patientId: '',
  scheduledAt: '',
  reason: ''
});

const form = reactive({
  ownerId: props.presetOwnerId,
  patientId: props.presetPatientId,
  scheduledAt: props.presetScheduledAt || new Date().toISOString().slice(0, 16),
  durationMinutes: props.presetDurationMinutes,
  visitType: props.presetVisitType,
  practitionerStaffId: props.presetPractitionerStaffId,
  serviceId: props.presetServiceId,
  unit: props.presetUnit,
  specialty: props.presetSpecialty,
  resourceLabel: props.presetResourceLabel,
  reason: props.presetReason,
  smartSchedulingRecommendationId: ''
});

const showOwnerModal = ref(false);
const showPatientModal = ref(false);
const ownerSubmitting = ref(false);
const patientSubmitting = ref(false);
const ownerDraft = reactive({
  fullName: '',
  whatsapp: '',
  phone: ''
});
const patientDraft = reactive({
  name: '',
  species: 'canine',
  sex: 'male' as 'male' | 'female' | 'unknown',
  breed: ''
});

const professionals = computed(() => props.professionals?.length ? props.professionals : runtimeProfessionals.value);
const ownerOptions = computed(() => owners.value.map((owner) => ({ label: owner.fullName, value: owner.id })));
const patientOptions = computed(() => {
  const scopedPatients =
    props.restrictPatientsToOwner && form.ownerId
      ? patients.value.filter((patient) => patient.primaryOwnerId === form.ownerId)
      : patients.value;

  const ranked = [...scopedPatients].sort((left, right) => {
    const leftRank = left.primaryOwnerId === form.ownerId ? 0 : 1;
    const rightRank = right.primaryOwnerId === form.ownerId ? 0 : 1;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.name.localeCompare(right.name, 'pt-BR');
  });

  return ranked.map((patient) => ({
    label: `${patient.name} (${speciesLabel(patient.species)})`,
    value: patient.id
  }));
});
const selectedProfessionalLabel = computed(() => {
  if (!form.practitionerStaffId) return 'Sem profissional';
  return professionals.value.find((professional) => professional.id === form.practitionerStaffId)?.fullName || 'Sem profissional';
});
const canCheckAvailability = computed(() => Boolean(form.ownerId && form.patientId && form.scheduledAt));
const canRecommendDuration = computed(() => Boolean(form.patientId && form.scheduledAt && form.visitType));
const recommendationApplied = computed(
  () => Boolean(form.smartSchedulingRecommendationId)
    && form.smartSchedulingRecommendationId === recommendation.value?.recommendationId
);
const recommendationConfidenceLabel = computed(() => {
  if (!recommendation.value) return '—';
  return `${Math.round(recommendation.value.confidence * 100)}%`;
});
const ownerPrimaryContact = computed(() => {
  const owner = props.ownerSnapshot;
  if (!owner) return 'Sem contato principal';
  const primary = owner.contacts.find((contact) => contact.primary) ?? owner.contacts[0];
  return primary ? `${primary.label}: ${primary.value}` : 'Sem contato principal';
});

let availabilityRequestId = 0;
let availabilityTimer: ReturnType<typeof setTimeout> | null = null;
let recommendationRequestId = 0;
let recommendationTimer: ReturnType<typeof setTimeout> | null = null;

function resetErrors() {
  errors.ownerId = '';
  errors.patientId = '';
  errors.scheduledAt = '';
  errors.reason = '';
}

function validateForm(): boolean {
  resetErrors();

  if (!form.ownerId) errors.ownerId = 'Selecione um tutor';
  if (!form.patientId) errors.patientId = 'Selecione um paciente';
  if (!form.scheduledAt) errors.scheduledAt = 'Data e hora são obrigatórias';
  if (!form.reason.trim()) errors.reason = 'Motivo é obrigatório';

  return !Object.values(errors).some(Boolean);
}

async function loadLookups() {
  ownersLoading.value = true;
  patientsLoading.value = true;
  servicesLoading.value = true;

  const referenceDate = form.scheduledAt ? new Date(form.scheduledAt).toISOString() : new Date().toISOString();

  try {
    const [ownersResponse, patientsResponse, overviewResponse, servicesResponse] = await Promise.allSettled([
      ownerService.list({ pageSize: 200, status: 'active' }),
      patientService.list({
        pageSize: 200,
        ownerId: props.restrictPatientsToOwner ? form.ownerId || undefined : undefined
      }),
      getSchedulingOverview({ viewMode: 'day', referenceDate }),
      servicesService.list()
    ]);

    if (ownersResponse.status === 'fulfilled') {
      owners.value = ownersResponse.value;
    }
    if (patientsResponse.status === 'fulfilled') {
      patients.value = patientsResponse.value;
    }
    if (overviewResponse.status === 'fulfilled') {
      runtimeProfessionals.value = overviewResponse.value.professionals;
    }
    if (servicesResponse.status === 'fulfilled') {
      services.value = servicesResponse.value;
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Erro ao carregar dados do fluxo rápido';
  } finally {
    ownersLoading.value = false;
    patientsLoading.value = false;
    servicesLoading.value = false;
  }
}

function handleOwnerChange() {
  if (props.lockOwnerSelection) return;
  if (!form.patientId) return;
  const patient = patients.value.find((item) => item.id === form.patientId);
  if (patient && form.ownerId && patient.primaryOwnerId !== form.ownerId) {
    form.patientId = '';
  }
}

function handlePatientChange() {
  const patient = patients.value.find((item) => item.id === form.patientId);
  if (!patient) return;
  if (!props.lockOwnerSelection) {
    form.ownerId = patient.primaryOwnerId;
  }
}

function closeOwnerModal() {
  showOwnerModal.value = false;
  ownerDraft.fullName = '';
  ownerDraft.whatsapp = '';
  ownerDraft.phone = '';
}

function openPatientInline() {
  if (!form.ownerId) {
    errors.ownerId = 'Selecione um tutor antes de cadastrar o paciente inline';
    return;
  }
  showPatientModal.value = true;
}

function closePatientModal() {
  showPatientModal.value = false;
  patientDraft.name = '';
  patientDraft.species = 'canine';
  patientDraft.sex = 'male';
  patientDraft.breed = '';
}

async function createInlineOwner() {
  if (props.lockOwnerSelection) {
    formError.value = 'O cliente já está travado neste fluxo';
    return;
  }
  if (!ownerDraft.fullName.trim()) {
    formError.value = 'Nome do tutor é obrigatório';
    return;
  }

  ownerSubmitting.value = true;
  formError.value = '';

  try {
    const contacts = [
      ownerDraft.whatsapp.trim()
        ? {
            label: 'WhatsApp',
            value: ownerDraft.whatsapp.trim(),
            type: 'whatsapp' as const,
            primary: true
          }
        : null,
      ownerDraft.phone.trim()
        ? {
            label: 'Telefone',
            value: ownerDraft.phone.trim(),
            type: 'phone' as const,
            primary: !ownerDraft.whatsapp.trim()
          }
        : null
    ].filter(Boolean) as Array<{
      label: string;
      value: string;
      type: 'phone' | 'whatsapp';
      primary: boolean;
    }>;

    const owner = await ownerService.create({
      fullName: ownerDraft.fullName.trim(),
      contacts,
      financialResponsible: true
    });

    owners.value = await ownerService.list({ pageSize: 200, status: 'active' });
    form.ownerId = owner.id;
    closeOwnerModal();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Erro ao cadastrar tutor inline';
  } finally {
    ownerSubmitting.value = false;
  }
}

async function createInlinePatient() {
  if (!form.ownerId) {
    formError.value = 'Selecione um tutor antes de cadastrar o paciente inline';
    return;
  }
  if (!patientDraft.name.trim()) {
    formError.value = 'Nome do paciente é obrigatório';
    return;
  }

  patientSubmitting.value = true;
  formError.value = '';

  try {
    const patient = await patientService.create({
      name: patientDraft.name.trim(),
      species: patientDraft.species,
      breed: patientDraft.breed.trim() || undefined,
      sex: patientDraft.sex,
      primaryOwnerId: form.ownerId,
      status: 'active'
    });

    patients.value = await patientService.list({
      pageSize: 200,
      ownerId: props.restrictPatientsToOwner ? form.ownerId : undefined
    });
    form.patientId = patient.id;
    closePatientModal();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Erro ao cadastrar paciente inline';
  } finally {
    patientSubmitting.value = false;
  }
}

async function refreshAvailability() {
  if (!canCheckAvailability.value) {
    availability.value = null;
    return;
  }

  availabilityLoading.value = true;
  const requestId = ++availabilityRequestId;

  try {
    const response = await appointmentService.getAvailability({
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      patientId: form.patientId,
      durationMinutes: form.durationMinutes,
      practitionerStaffId: form.practitionerStaffId || undefined,
      resourceLabel: form.resourceLabel.trim() || undefined
    });

    if (requestId === availabilityRequestId) {
      availability.value = response;
    }
  } catch (error) {
    if (requestId === availabilityRequestId) {
      availability.value = null;
      formError.value = error instanceof Error ? error.message : 'Erro ao validar disponibilidade';
    }
  } finally {
    if (requestId === availabilityRequestId) {
      availabilityLoading.value = false;
    }
  }
}

async function refreshRecommendation() {
  if (!canRecommendDuration.value) {
    recommendation.value = null;
    form.smartSchedulingRecommendationId = '';
    return;
  }

  recommendationLoading.value = true;
  const requestId = ++recommendationRequestId;

  try {
    const response = await appointmentService.recommendDuration({
      patientId: form.patientId,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      visitType: form.visitType,
      reason: form.reason.trim() || undefined,
      practitionerStaffId: form.practitionerStaffId || undefined,
      serviceId: form.serviceId || undefined,
      specialty: form.specialty.trim() || undefined,
      unit: form.unit.trim() || undefined,
      resourceLabel: form.resourceLabel.trim() || undefined
    });

    if (requestId === recommendationRequestId) {
      recommendation.value = response;
      if (
        form.smartSchedulingRecommendationId
        && form.smartSchedulingRecommendationId !== response.recommendationId
      ) {
        form.smartSchedulingRecommendationId = '';
      }
    }
  } catch (error) {
    if (requestId === recommendationRequestId) {
      recommendation.value = null;
      form.smartSchedulingRecommendationId = '';
      formError.value = error instanceof Error ? error.message : 'Erro ao gerar sugestão de duração';
    }
  } finally {
    if (requestId === recommendationRequestId) {
      recommendationLoading.value = false;
    }
  }
}

function scheduleAvailabilityRefresh() {
  if (availabilityTimer) {
    clearTimeout(availabilityTimer);
  }

  availabilityTimer = setTimeout(() => {
    void refreshAvailability();
  }, 250);
}

function scheduleRecommendationRefresh() {
  if (recommendationTimer) {
    clearTimeout(recommendationTimer);
  }

  recommendationTimer = setTimeout(() => {
    void refreshRecommendation();
  }, 300);
}

function applySuggestion(startsAt: string) {
  form.scheduledAt = startsAt.slice(0, 16);
}

function applyRecommendation() {
  if (!recommendation.value) return;
  form.durationMinutes = recommendation.value.predictedDurationMinutes;
  form.smartSchedulingRecommendationId = recommendation.value.recommendationId;
}

function formatRange(startsAt: string, endsAt: string): string {
  return `${new Date(startsAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })} - ${new Date(endsAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

async function submit() {
  if (!validateForm()) return;

  submitting.value = true;
  formError.value = '';

  try {
    const appointment = await appointmentService.create({
      patientId: form.patientId,
      ownerId: form.ownerId,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      durationMinutes: form.durationMinutes,
      visitType: form.visitType,
      practitionerStaffId: form.practitionerStaffId || undefined,
      serviceId: form.serviceId || undefined,
      unit: form.unit.trim() || undefined,
      specialty: form.specialty.trim() || undefined,
      resourceLabel: form.resourceLabel.trim() || undefined,
      reason: form.reason.trim(),
      smartSchedulingRecommendationId: form.smartSchedulingRecommendationId || undefined
    });

    emit('created', appointment);
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Erro ao criar agendamento';
  } finally {
    submitting.value = false;
  }
}

watch(
  () => [form.ownerId, form.patientId, form.scheduledAt, form.durationMinutes, form.practitionerStaffId, form.resourceLabel],
  () => {
    if (!canCheckAvailability.value) {
      availability.value = null;
      return;
    }
    scheduleAvailabilityRefresh();
  }
);

watch(
  () => [form.patientId, form.scheduledAt, form.visitType, form.reason, form.specialty, form.serviceId, form.unit, form.resourceLabel, form.practitionerStaffId],
  () => {
    if (!canRecommendDuration.value) {
      recommendation.value = null;
      form.smartSchedulingRecommendationId = '';
      return;
    }
    scheduleRecommendationRefresh();
  }
);

watch(
  () => form.durationMinutes,
  (durationMinutes) => {
    if (recommendation.value && durationMinutes !== recommendation.value.predictedDurationMinutes) {
      form.smartSchedulingRecommendationId = '';
    }
  }
);

watch(
  () => props.presetOwnerId,
  (ownerId) => {
    if (ownerId) {
      form.ownerId = ownerId;
    }
  }
);

watch(
  () => props.presetPatientId,
  (patientId) => {
    if (patientId) {
      form.patientId = patientId;
    }
  }
);

watch(
  () => props.presetScheduledAt,
  (scheduledAt) => {
    if (scheduledAt) {
      form.scheduledAt = scheduledAt;
    }
  }
);

watch(
  () => props.presetDurationMinutes,
  (durationMinutes) => {
    if (typeof durationMinutes === 'number' && durationMinutes > 0) {
      form.durationMinutes = durationMinutes;
    }
  }
);

watch(
  () => props.presetPractitionerStaffId,
  (practitionerStaffId) => {
    form.practitionerStaffId = practitionerStaffId || '';
  }
);

onMounted(async () => {
  await loadLookups();
  if (canRecommendDuration.value) {
    await refreshRecommendation();
  }
  if (canCheckAvailability.value) {
    await refreshAvailability();
  }
});
</script>

<style scoped>
.appointment-quick-create {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.appointment-quick-create__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr);
  gap: 16px;
  align-items: start;
}

.appointment-quick-create--compact .appointment-quick-create__layout {
  grid-template-columns: 1fr;
}

.appointment-quick-create__form,
.appointment-quick-create__aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inline-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.inline-actions--start {
  justify-content: flex-start;
}

.selected-client {
  display: grid;
  gap: 4px;
  color: var(--color-text-secondary, #475569);
}

.availability-state {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.summary-list__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-list__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.availability-list {
  margin-top: 16px;
}

.availability-list h4 {
  margin: 0 0 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.availability-list ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary, #475569);
}

.suggestions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.slot-chip {
  border: 1px solid var(--color-border, #cbd5e1);
  background: var(--color-surface, #fff);
  color: var(--color-text, #0f172a);
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
}

.slot-chip--available {
  border-color: rgba(22, 163, 74, 0.35);
  background: rgba(22, 163, 74, 0.08);
}

.modal-form {
  display: grid;
  gap: 12px;
}

@media (max-width: 960px) {
  .appointment-quick-create__layout {
    grid-template-columns: 1fr;
  }
}
</style>
