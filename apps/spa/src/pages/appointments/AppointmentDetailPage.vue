<template>
  <div class="appointment-detail-page">
    <div v-if="!appointment" class="page-loading">
      <p>Carregando ou agendamento não encontrado.</p>
      <DsButton variant="secondary" tag="a" href="/appointments">Voltar à agenda</DsButton>
    </div>
    <template v-else>
      <DsAlert v-if="whatsappNotice" :variant="whatsappNotice.variant" dismissible @dismiss="clearWhatsappNotice">
        {{ whatsappNotice.message }}
      </DsAlert>

      <AppPageHeader :subtitle="detailSubtitle">
        <template #title>📅 Agendamento</template>
        <template #subtitle>
          <StatusBadge
            :label="appointmentStatusLabel(appointment.status)"
            :variant="appointmentStatusVariant(appointment.status)"
          />
          <span class="muted">{{ patientName || 'Paciente em carregamento' }}</span>
        </template>
        <template #actions>
          <DsButton
            v-if="canGoToQueue"
            tag="a"
            href="/queue"
            variant="primary"
          >
            Ir para fila operacional
          </DsButton>
          <DsButton tag="a" :to="`/patients/${appointment.patientId}`" variant="secondary">
            Ver paciente
          </DsButton>
          <DsButton tag="a" :to="`/owners/${appointment.ownerId}`" variant="ghost">
            Ver tutor
          </DsButton>
          <DsButton v-if="canCancel" variant="danger" :loading="cancelling" @click="handleCancel">
            {{ cancelling ? 'Cancelando...' : 'Cancelar Agendamento' }}
          </DsButton>
          <DsButton variant="secondary" tag="a" href="/appointments">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <DsCard title="Ficha resumida">
        <div class="summary-grid">
          <div v-for="card in summaryCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>

      <div class="appointment-detail-page__grid">
        <DsCard title="Visão rápida">
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-item__label">Data/Hora</span>
              <strong>{{ formatDateTime(appointment.scheduledAt) }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Tipo</span>
              <strong>{{ visitTypeLabel(appointment.visitType) }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Paciente</span>
              <strong>{{ patientName || 'Carregando...' }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Tutor</span>
              <strong>{{ ownerName || 'Carregando...' }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Profissional</span>
              <strong>{{ appointment.practitionerStaffId || 'Não alocado' }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Sala/Recurso</span>
              <strong>{{ appointment.resourceLabel || 'Não informado' }}</strong>
            </div>
          </div>
        </DsCard>

        <AppDetailSection title="Informações">
          <div class="detail-row">
            <span class="detail-row__label">Data/Hora</span>
            <span>{{ formatDateTime(appointment.scheduledAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Tipo</span>
            <span>{{ visitTypeLabel(appointment.visitType) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Paciente</span>
            <span>{{ patientName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Tutor</span>
            <span>{{ ownerName }}</span>
          </div>
          <div v-if="appointment.specialty" class="detail-row">
            <span class="detail-row__label">Especialidade</span>
            <span>{{ appointment.specialty }}</span>
          </div>
          <div v-if="appointment.unit" class="detail-row">
            <span class="detail-row__label">Unidade/Setor</span>
            <span>{{ appointment.unit }}</span>
          </div>
          <div v-if="appointment.resourceLabel" class="detail-row">
            <span class="detail-row__label">Sala/Recurso</span>
            <span>{{ appointment.resourceLabel }}</span>
          </div>
        </AppDetailSection>

        <AppDetailSection v-if="appointment.reason" title="Motivo">
          <p>{{ appointment.reason }}</p>
        </AppDetailSection>

        <DsCard title="Confirmação por WhatsApp">
          <div class="whatsapp-card">
            <p v-if="whatsappContact" class="whatsapp-card__text">
              Abrir conversa com o tutor e enviar a confirmação pré-preenchida para
              <strong>{{ ownerName }}</strong>.
            </p>
            <p v-else class="whatsapp-card__text">
              Este tutor ainda não possui contato WhatsApp configurado.
            </p>

            <div class="whatsapp-card__actions">
              <DsButton
                v-if="whatsappUrl"
                variant="primary"
                tag="a"
                :href="whatsappUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir WhatsApp
              </DsButton>
              <DsButton
                variant="secondary"
                :disabled="!whatsappMessage"
                @click="copyWhatsAppMessage"
              >
                Copiar mensagem
              </DsButton>
            </div>
          </div>
        </DsCard>

        <AppDetailSection title="Informações Administrativas">
          <p class="muted">Criado em: {{ formatDate(appointment.createdAt) }}</p>
          <p class="muted">Atualizado em: {{ formatDate(appointment.updatedAt) }}</p>
          <p class="muted">Use este agendamento como ponte entre recepção, fila e atendimento.</p>
        </AppDetailSection>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { appointmentService } from '@/services/appointment';
import type { AppointmentSummary } from '@/types/appointment';
import { ownerService } from '@/services/owner';
import type { OwnerSummary } from '@/types/owner';
import { visitTypeLabel, appointmentStatusLabel, formatDateTime, formatDate } from '@/utils/labels';
import { useEntityCache } from '@/composables/useEntityCache';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const route = useRoute();
const appointment = ref<AppointmentSummary | null>(null);
const cancelling = ref(false);
const entityCache = useEntityCache();
const owner = ref<OwnerSummary | null>(null);

const patientName = ref('');
const ownerName = ref('');
const whatsappNotice = ref<{ variant: 'success' | 'danger'; message: string } | null>(null);

function appointmentStatusVariant(s: string) {
  const map: Record<string, string> = {
    scheduled: 'info',
    checked_in: 'warning',
    completed: 'neutral',
    cancelled: 'danger'
  };
  return (map[s] || 'default') as any;
}

async function loadEntityNames(appt: AppointmentSummary) {
  patientName.value = await entityCache.getPatientName(appt.patientId);
  try {
    owner.value = await ownerService.getById(appt.ownerId);
    ownerName.value = owner.value.fullName;
  } catch {
    owner.value = null;
    ownerName.value = await entityCache.getOwnerName(appt.ownerId);
  }
}

const canCancel = computed(() => {
  return (
    appointment.value &&
    (appointment.value.status === 'scheduled' || appointment.value.status === 'checked_in')
  );
});
const canGoToQueue = computed(() => appointment.value?.status === 'checked_in');

const whatsappContact = computed(() => {
  return owner.value?.contacts.find((contact) => contact.type === 'whatsapp' && contact.value.trim()) ?? null;
});

const whatsappMessage = computed(() => {
  if (!appointment.value || !patientName.value || !ownerName.value) return '';

  const scheduledAt = formatDateTime(appointment.value.scheduledAt);
  const reason = appointment.value.reason?.trim() || 'consulta agendada';

  return [
    `Olá, ${ownerName.value}.`,
    `Confirmamos o agendamento de ${patientName.value} para ${scheduledAt}.`,
    `Motivo: ${reason}.`
  ].join(' ');
});

const whatsappUrl = computed(() => {
  const contact = whatsappContact.value?.value ?? '';
  const digits = contact.replace(/\D/g, '');
  if (!digits || !whatsappMessage.value) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage.value)}`;
});

const detailSubtitle = computed(() => {
  if (!appointment.value) return '';
  return `Atendimento > Agenda • ${appointment.value.id}`;
});

const summaryCards = computed(() => {
  if (!appointment.value) return [];
  return [
    { label: 'Data/Hora', value: formatDateTime(appointment.value.scheduledAt), hint: 'Momento agendado' },
    { label: 'Tipo', value: visitTypeLabel(appointment.value.visitType), hint: 'Natureza da visita' },
    { label: 'Paciente', value: patientName.value || '—', hint: 'Atendimento vinculado' },
    { label: 'Tutor', value: ownerName.value || '—', hint: 'Responsável principal' },
    {
      label: 'Duração',
      value: `${appointment.value.durationMinutes || 30} min`,
      hint: 'Janela reservada'
    },
    {
      label: 'Sala',
      value: appointment.value.resourceLabel || '—',
      hint: 'Alocação operacional'
    }
  ];
});

async function handleCancel() {
  if (!appointment.value) return;
  if (!confirm('Deseja cancelar este agendamento?')) return;
  cancelling.value = true;
  try {
    await appointmentService.cancel(appointment.value.id);
    appointment.value.status = 'cancelled';
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao cancelar');
  } finally {
    cancelling.value = false;
  }
}

async function copyWhatsAppMessage() {
  if (!whatsappMessage.value) return;
  try {
    await navigator.clipboard.writeText(whatsappMessage.value);
    whatsappNotice.value = {
      variant: 'success',
      message: 'Mensagem de confirmação copiada para a área de transferência.'
    };
  } catch {
    whatsappNotice.value = {
      variant: 'danger',
      message: 'Não foi possível copiar a mensagem. Use o botão para abrir o WhatsApp.'
    };
  }
}

function clearWhatsappNotice() {
  whatsappNotice.value = null;
}

onMounted(async () => {
  const fromState = history.state?.appointment as AppointmentSummary | undefined;
  if (fromState) {
    appointment.value = fromState;
    await loadEntityNames(fromState);
    return;
  }
  const id = route.params.id as string;
  try {
    const appt = await appointmentService.getById(id);
    appointment.value = appt;
    await loadEntityNames(appt);
  } catch {
    // Appointment not found, keep null
  }
});
</script>

<style scoped>
.appointment-detail-page__grid {
  display: grid;
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.summary-item {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: var(--color-bg-subtle, #f8fafc);
}

.summary-item__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.whatsapp-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.whatsapp-card__text {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.whatsapp-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
