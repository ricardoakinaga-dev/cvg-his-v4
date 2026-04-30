<template>
  <div class="rh-page">
    <AppPageHeader
      title="Folgas"
      :breadcrumbs="['RH', 'Cadastros', 'Folgas']"
      subtitle="Indisponibilidades formais que impactam agenda, escala e alocação de equipe"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" disabled>Incluir</DsButton>
        <DsButton variant="primary" tag="a" to="/appointments">Abrir agenda</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície Vetus-like para a rota legada Agenda/Folgas.htm, registrada na evidência rh-folgas-01.png como
      indisponível no beta. A documentação aponta GET /time-off?professionalId=&dateFrom=&dateTo=, POST /time-off e
      DELETE /time-off/{id}; enquanto não houver contrato local auditável, a tela prepara a pesquisa sem criar ou
      remover folgas.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard title="Pesquisar folgas">
      <div class="rh-page__filters">
        <DsInput id="time-off-professional" v-model="filters.professionalId" type="select" label="Profissional">
          <option value="">Todos os profissionais ativos</option>
          <option v-for="member in activeStaff" :key="member.id" :value="member.id">
            {{ member.fullName }}
          </option>
        </DsInput>
        <DsInput id="time-off-date-from" v-model="filters.dateFrom" type="date" label="Data inicial" />
        <DsInput id="time-off-date-to" v-model="filters.dateTo" type="date" label="Data final" />
        <DsInput
          id="time-off-reason-status"
          v-model="filters.reasonStatus"
          label="Motivo/Status"
          placeholder="Férias, folga, indisponível..."
        />
      </div>
      <div class="rh-page__actions">
        <DsButton variant="secondary" disabled>Incluir</DsButton>
        <DsButton :loading="loading" @click="prepareSearch">Pesquisar</DsButton>
      </div>
      <p class="rh-page__hint">
        Sem contrato persistente local para POST ou DELETE de folgas. Ações de cadastro, abertura e remoção ficam
        bloqueadas.
      </p>
    </DsCard>

    <DsAlert v-if="searchSummary" variant="success">
      {{ searchSummary }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard :label="`${filteredStaff.length} profissional(is) na pesquisa`" value="" icon="✅" />
      <DsStatCard :label="`${departmentsCount} departamento(s)`" value="" icon="🏢" />
      <DsStatCard :label="`${unlinkedCount} sem usuário vinculado`" value="" icon="⚠️" />
    </section>

    <DsCard title="Cobertura por profissional">
      <DataTable
        :columns="columns"
        :rows="staffRows"
        :loading="loading"
        empty-icon="🌴"
        empty-title="Nenhum profissional encontrado"
        empty-description="Ajuste o profissional pesquisado ou cadastre profissionais ativos antes de organizar folgas."
        variant="hoverable"
      >
        <template #cell-period="{ row }">
          {{ timeOffRow(row).period }}
        </template>
        <template #cell-reasonStatus="{ row }">
          {{ timeOffRow(row).reasonStatus }}
        </template>
        <template #cell-userLinked="{ row }">
          {{ timeOffRow(row).userLinked ? 'Usuário vinculado' : 'Sem usuário vinculado' }}
        </template>
        <template #cell-open>
          <DsButton size="sm" variant="secondary" disabled>Abrir</DsButton>
        </template>
      </DataTable>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import { staffService } from '@/services/staff';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

interface TimeOffRow {
  id: string;
  fullName: string;
  department: string;
  jobTitle: string;
  period: string;
  reasonStatus: string;
  agendaImpact: string;
  userLinked: boolean;
  open: string;
}

const loading = ref(false);
const error = ref('');
const staff = ref<StaffSummary[]>([]);
const searchSubmitted = ref(false);
const filters = ref({
  professionalId: '',
  dateFrom: '',
  dateTo: '',
  reasonStatus: ''
});

const columns: DataTableColumn[] = [
  { key: 'fullName', label: 'Profissional' },
  { key: 'department', label: 'Departamento' },
  { key: 'jobTitle', label: 'Cargo' },
  { key: 'period', label: 'Período preparado' },
  { key: 'reasonStatus', label: 'Motivo/Status' },
  { key: 'agendaImpact', label: 'Impacto na agenda' },
  { key: 'userLinked', label: 'Vínculo de acesso' },
  { key: 'open', label: 'Abrir' }
];

const activeStaff = computed(() => staff.value.filter((member) => member.status === 'active'));
const selectedStaff = computed(() =>
  filters.value.professionalId ? activeStaff.value.find((member) => member.id === filters.value.professionalId) : null
);
const filteredStaff = computed(() => (selectedStaff.value ? [selectedStaff.value] : activeStaff.value));
const departmentsCount = computed(
  () => new Set(filteredStaff.value.map((member) => member.department).filter(Boolean)).size
);
const unlinkedCount = computed(() => filteredStaff.value.filter((member) => !member.userId).length);
const staffRows = computed(() =>
  filteredStaff.value.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    department: member.department || '—',
    jobTitle: member.jobTitle || '—',
    period: preparedPeriod.value,
    reasonStatus: filters.value.reasonStatus.trim() || 'Sem registro persistente',
    agendaImpact: 'Conferir agenda antes de bloquear horários',
    userLinked: Boolean(member.userId),
    open: 'Bloqueado'
  })) as DataTableRow[]
);
const preparedPeriod = computed(() => {
  const dateFrom = formatDate(filters.value.dateFrom);
  const dateTo = formatDate(filters.value.dateTo);
  if (dateFrom === 'data não informada' && dateTo === 'data não informada') return 'Período não informado';
  return `${dateFrom} a ${dateTo}`;
});
const searchSummary = computed(() => {
  if (!searchSubmitted.value) return '';
  const scope = selectedStaff.value?.fullName ?? 'todos os profissionais ativos';
  const reasonStatus = filters.value.reasonStatus.trim() || 'não informado';
  return `Pesquisa preparada para folgas de ${scope} entre ${formatDate(filters.value.dateFrom)} e ${formatDate(
    filters.value.dateTo
  )} com motivo/status ${reasonStatus}. Sem escrita de folga no contrato local.`;
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    staff.value = await staffService.list();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cobertura de folgas';
  } finally {
    loading.value = false;
  }
}

function prepareSearch() {
  searchSubmitted.value = true;
}

function timeOffRow(row: DataTableRow): TimeOffRow {
  return row as unknown as TimeOffRow;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return 'data não informada';
  return `${day}/${month}/${year}`;
}

onMounted(loadData);
</script>

<style scoped>
.rh-page {
  display: grid;
  gap: 16px;
}

.rh-page__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.rh-page__filters {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) repeat(2, minmax(160px, 220px)) minmax(180px, 1fr);
  gap: 12px;
}

.rh-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

.rh-page__hint {
  margin: 12px 0 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

@media (max-width: 900px) {
  .rh-page__filters {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 640px) {
  .rh-page__filters {
    grid-template-columns: 1fr;
  }

  .rh-page__actions {
    justify-content: stretch;
  }

  .rh-page__actions :deep(.ds-btn) {
    flex: 1 1 140px;
  }
}
</style>
