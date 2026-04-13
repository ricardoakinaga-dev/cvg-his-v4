<template>
  <div class="owner-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" width="70%" />
      </div>
    </div>
    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <template v-else-if="owner">
      <AppPageHeader>
        <template #title>{{ owner.fullName }}</template>
        <template #subtitle>
          <StatusBadge
            :label="owner.status === 'active' ? 'Ativo' : 'Inativo'"
            :variant="owner.status === 'active' ? 'success' : 'danger'"
          />
          <StatusBadge v-if="owner.financialResponsible" label="Resp. Financeiro" variant="info" />
          <span class="muted">Atendimento &gt; Cadastrados</span>
        </template>
        <template #actions>
          <DsButton tag="a" :to="`/owners/${owner.id}/edit`" variant="secondary">Editar</DsButton>
          <DsButton variant="secondary" tag="a" to="/owners">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <!-- Hub: KPI Cards -->
      <section class="hub-kpis">
        <DsStatCard
          :label="patients.length + ' paciente(s)'"
          value=""
          icon="🐾"
          :loading="loadingPatients"
        />
        <DsStatCard
          :label="owner.contacts.length + ' contato(s)'"
          value=""
          icon="📞"
        />
        <DsStatCard
          :label="owner.financialResponsible ? 'Sim' : 'Não'"
          value=""
          icon="💰"
        />
        <DsStatCard
          :label="inactivePatientsCount + ' inativo(s)'"
          value=""
          icon="⚠️"
          :error="inactivePatientsCount > 0 ? 'Há pacientes inativos' : undefined"
        />
      </section>

      <!-- Hub: Alerts -->
      <section v-if="ownerAlerts.length > 0" class="hub-alerts">
        <DsAlert
          v-for="(alert, i) in ownerAlerts"
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
            <DsButton
              tag="a"
              :to="`/patients/new?ownerId=${owner.id}`"
              variant="primary"
              icon="🐾"
            >
              Novo Paciente
            </DsButton>
            <DsButton
              tag="a"
              :to="`/appointments/new?ownerId=${owner.id}`"
              variant="secondary"
              icon="📅"
            >
              Agendar
            </DsButton>
            <DsButton
              tag="a"
              to="/patients"
              variant="ghost"
              icon="🐾"
            >
              Pacientes
            </DsButton>
            <DsButton
              v-if="whatsappContact"
              :href="whatsappContact"
              variant="secondary"
              icon="💬"
            >
              WhatsApp
            </DsButton>
          </div>
        </DsCard>
      </section>

      <div class="owner-detail-page__hero">
        <DsCard title="Ficha resumida">
          <div class="summary-grid">
            <div v-for="card in summaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </div>
          </div>
        </DsCard>
      </div>

      <!-- Hub: Associated Patients -->
      <section v-if="patients.length > 0" class="hub-patients">
        <DsCard title="Pacientes vinculados">
          <DataTable
            :columns="patientColumns"
            :rows="patients"
            variant="hoverable"
          >
            <template #cell-name="{ row }">
              <DsButton tag="a" :to="`/patients/${(row as PatientSummary).id}`" variant="ghost" size="sm">
                {{ (row as PatientSummary).name }}
              </DsButton>
            </template>
            <template #cell-species="{ row }">
              {{ speciesLabel((row as PatientSummary).species) }}
            </template>
            <template #cell-status="{ row }">
              <StatusBadge
                :label="patientStatusLabel((row as PatientSummary).status)"
                :variant="(row as PatientSummary).status === 'active' ? 'success' : 'danger'"
              />
            </template>
            <template #cell-actions="{ row }">
              <DsButton tag="a" :to="`/patients/${(row as PatientSummary).id}`" size="sm" variant="secondary">
                Ver
              </DsButton>
            </template>
          </DataTable>
        </DsCard>
      </section>

      <div class="owner-detail-page__grid">
        <AppDetailSection title="Documento">
          <p v-if="owner.documentId">
            <code>{{ owner.documentId }}</code>
          </p>
          <p v-else class="muted">Não informado</p>
        </AppDetailSection>

        <AppDetailSection title="Contatos">
          <div v-if="owner.contacts.length" class="contacts-list">
            <div v-for="(contact, i) in owner.contacts" :key="i" class="contact-item">
              <span v-if="contact.primary" class="contact-item__primary">★</span>
              <strong>{{ contact.label }}</strong>: {{ contact.value }}
              <StatusBadge
                v-if="contact.type === 'whatsapp'"
                label="WA"
                variant="success"
                size="sm"
              />
            </div>
          </div>
          <p v-else class="muted">Nenhum contato cadastrado</p>
        </AppDetailSection>

        <AppDetailSection v-if="owner.administrativeNotes" title="Observações">
          <p>{{ owner.administrativeNotes }}</p>
        </AppDetailSection>

        <AppDetailSection title="Informações">
          <p class="muted">Criado em: {{ formatDate(owner.createdAt) }}</p>
          <p class="muted">Atualizado em: {{ formatDate(owner.updatedAt) }}</p>
        </AppDetailSection>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import type { OwnerSummary, OwnerContact } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
import { formatDate, speciesLabel, patientStatusLabel } from '@/utils/labels';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';

const route = useRoute();
const owner = ref<OwnerSummary | null>(null);
const patients = ref<PatientSummary[]>([]);
const loading = ref(true);
const loadingPatients = ref(true);
const error = ref('');

const inactivePatientsCount = computed(
  () => patients.value.filter((p) => p.status !== 'active').length
);

const whatsappContact = computed(() => {
  if (!owner.value) return null;
  const wa = owner.value.contacts.find((c) => c.type === 'whatsapp');
  if (!wa) return null;
  const number = wa.value.replace(/\D/g, '');
  return `https://wa.me/${number}`;
});

interface OwnerAlert {
  variant: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

const ownerAlerts = computed<OwnerAlert[]>(() => {
  if (!owner.value) return [];
  const alerts: OwnerAlert[] = [];
  if (!owner.value.documentId) {
    alerts.push({ variant: 'warning', title: 'Documento ausente', message: 'Cadastre o documento de identificação do tutor.' });
  }
  if (owner.value.contacts.length === 0) {
    alerts.push({ variant: 'warning', title: 'Sem contatos', message: 'Adicione pelo menos um canal de contato.' });
  }
  if (owner.value.status === 'inactive') {
    alerts.push({ variant: 'danger', title: 'Tutor inativo', message: 'Este tutor está marcado como inativo e não aparecerá na operação.' });
  }
  if (inactivePatientsCount.value > 0) {
    alerts.push({ variant: 'info', title: 'Pacientes inativos', message: `${inactivePatientsCount.value} paciente(s) vinculado(s) estão inativos.` });
  }
  return alerts;
});

const summaryCards = computed(() => {
  if (!owner.value) return [];
  return [
    {
      label: 'Documento',
      value: owner.value.documentId || 'Não informado',
      hint: 'Identificação fiscal'
    },
    {
      label: 'Contatos',
      value: owner.value.contacts.length.toString(),
      hint: 'Canais cadastrados'
    },
    {
      label: 'Principal',
      value:
        owner.value.contacts.find((contact: OwnerContact) => contact.primary)?.label ||
        owner.value.contacts[0]?.label ||
        '—',
      hint: 'Contato de referência'
    },
    {
      label: 'Financeiro',
      value: owner.value.financialResponsible ? 'Sim' : 'Não',
      hint: 'Responsável financeiro'
    }
  ];
});

const patientColumns: DataTableColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'species', label: 'Espécie' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

async function loadPatients(ownerId: string) {
  loadingPatients.value = true;
  try {
    const all = await patientService.list();
    patients.value = all.filter((p) => p.primaryOwnerId === ownerId);
  } catch {
    patients.value = [];
  } finally {
    loadingPatients.value = false;
  }
}

onMounted(async () => {
  const id = route.params.id as string;
  try {
    owner.value = await ownerService.getById(id);
    await loadPatients(id);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar tutor';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.owner-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.owner-detail-page__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.owner-detail-page__hero {
  margin-bottom: 0;
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

.hub-patients {
  margin-bottom: 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.contact-item__primary {
  color: var(--color-warning-500, #f59e0b);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
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
</style>
