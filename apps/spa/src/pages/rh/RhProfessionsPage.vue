<template>
  <div class="rh-page">
    <AppPageHeader
      title="Profissões"
      :breadcrumbs="['RH', 'Cadastros', 'Profissões']"
      subtitle="Cadastro mestre classificatório que padroniza funções de profissionais"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" disabled>Incluir</DsButton>
        <DsButton variant="secondary" tag="a" to="/staff">Abrir profissionais</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície Vetus-like para a rota legada Cadastros/Profissoes.htm. Profissões funcionam como cadastro mestre
      classificatório: padronizam funções, alimentam profissionais, sustentam filtros, regras de comissão, agenda e
      produtividade. Enquanto não houver contrato local auditável, a tela prepara pesquisa sem criar, editar ou
      excluir profissões.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard title="Pesquisar profissões">
      <div class="rh-page__filters">
        <DsInput
          id="profession-description"
          v-model="filters.description"
          label="Descrição"
          placeholder="Descrição da profissão"
        />
        <DsInput
          id="profession-linked"
          v-model="filters.linked"
          label="Profissional vinculado"
          placeholder="Nome, departamento ou profissional"
        />
      </div>
      <div class="rh-page__actions">
        <DsButton variant="secondary" disabled>Incluir</DsButton>
        <DsButton :loading="loading" @click="prepareSearch">Pesquisar</DsButton>
      </div>
      <p class="rh-page__hint">
        Sem contrato persistente local para cadastro de profissões. Ações de inclusão, abertura, edição e exclusão
        ficam bloqueadas.
      </p>
    </DsCard>

    <DsAlert v-if="searchSummary" variant="success">
      {{ searchSummary }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard :label="`${filteredRows.length} profissão(ões)`" value="" icon="🪪" />
      <DsStatCard :label="`${activeProfessionalsCount} profissional(is) ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${uncategorizedCount} sem cargo`" value="" icon="⚠️" />
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="🪪"
      empty-title="Nenhuma profissão encontrada"
      empty-description="Cadastre cargos nos profissionais para formar esta lista operacional."
      variant="hoverable"
    >
      <template #cell-profession="{ row }">
        <strong>{{ professionRow(row).profession }}</strong>
      </template>
      <template #cell-professionals="{ row }">
        {{ professionRow(row).professionals.join(', ') }}
      </template>
      <template #cell-open>
        <DsButton size="sm" variant="secondary" disabled>Abrir</DsButton>
      </template>
    </DataTable>
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

interface ProfessionRow {
  id: string;
  profession: string;
  departments: string;
  activeCount: number;
  inactiveCount: number;
  professionals: string[];
  open: string;
}

const loading = ref(false);
const error = ref('');
const staff = ref<StaffSummary[]>([]);
const searchSubmitted = ref(false);
const filters = ref({
  description: '',
  linked: ''
});

const columns: DataTableColumn[] = [
  { key: 'profession', label: 'Profissão' },
  { key: 'departments', label: 'Departamentos' },
  { key: 'activeCount', label: 'Ativos' },
  { key: 'inactiveCount', label: 'Inativos' },
  { key: 'professionals', label: 'Profissionais vinculados' },
  { key: 'open', label: 'Abrir' }
];

const professionRows = computed<ProfessionRow[]>(() => {
  const groups = new Map<string, StaffSummary[]>();

  for (const member of staff.value) {
    const profession = member.jobTitle?.trim();
    if (!profession) continue;
    groups.set(profession, [...(groups.get(profession) ?? []), member]);
  }

  return Array.from(groups.entries())
    .map(([profession, members]) => ({
      id: profession.toLowerCase().replace(/\s+/g, '-'),
      profession,
      departments: Array.from(new Set(members.map((member) => member.department).filter(Boolean))).join(', ') || '—',
      activeCount: members.filter((member) => member.status === 'active').length,
      inactiveCount: members.filter((member) => member.status !== 'active').length,
      professionals: members.map((member) => member.fullName).sort((left, right) => left.localeCompare(right)),
      open: 'Bloqueado'
    }))
    .sort((left, right) => left.profession.localeCompare(right.profession));
});

const filteredRows = computed(() => {
  const description = filters.value.description.trim().toLowerCase();
  const linked = filters.value.linked.trim().toLowerCase();
  const rows = professionRows.value;

  return rows.filter((row) => {
    const matchesDescription = !description || row.profession.toLowerCase().includes(description);
    const matchesLinked =
      !linked ||
      [row.departments, ...row.professionals].some((value) => value.toLowerCase().includes(linked));
    return matchesDescription && matchesLinked;
  }) as unknown as DataTableRow[];
});

const activeProfessionalsCount = computed(() =>
  staff.value.filter((member) => member.status === 'active' && member.jobTitle?.trim()).length
);
const uncategorizedCount = computed(() => staff.value.filter((member) => !member.jobTitle?.trim()).length);
const searchSummary = computed(() => {
  if (!searchSubmitted.value) return '';
  const description = filters.value.description.trim() || 'qualquer descrição';
  const linked = filters.value.linked.trim() || 'qualquer vínculo';
  return `Pesquisa preparada para profissões com descrição ${description} e vínculo ${linked}. Sem escrita no cadastro mestre.`;
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    staff.value = await staffService.list();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar profissões';
  } finally {
    loading.value = false;
  }
}

function prepareSearch() {
  searchSubmitted.value = true;
}

function professionRow(row: unknown): ProfessionRow {
  return row as ProfessionRow;
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
  grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr);
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
