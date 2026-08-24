<template>
  <div class="rh-page">
    <AppPageHeader
      title="Profissões"
      :breadcrumbs="['RH', 'Cadastros', 'Profissões']"
      subtitle="Cadastro mestre classificatório que padroniza funções de profissionais"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? 'Fechar' : 'Incluir' }}
        </DsButton>
        <DsButton variant="secondary" tag="a" to="/staff">Abrir profissionais</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície Vetus-like para a rota legada Cadastros/Profissoes.htm. Profissões funcionam como cadastro mestre
      classificatório: padronizam funções, alimentam profissionais, sustentam filtros, regras de comissão, agenda e
      produtividade. O cadastro é persistido por tenant e mantém o vínculo histórico dos profissionais.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <DsCard v-if="showCreateForm" title="Cadastrar profissão">
      <form aria-label="Cadastrar profissão" class="rh-page__create-form" @submit.prevent="createProfession">
        <DsInput
          id="profession-code"
          v-model="createForm.code"
          label="Código"
          required
          placeholder="Ex: VET-CLIN"
        />
        <DsInput
          id="profession-name"
          v-model="createForm.name"
          label="Nome"
          required
          placeholder="Ex: Médico Veterinário"
        />
        <DsInput
          id="profession-create-description"
          v-model="createForm.description"
          label="Descrição"
          placeholder="Escopo da profissão"
        />
        <div class="rh-page__actions">
          <DsButton variant="primary" :loading="submitting" type="submit">Salvar profissão</DsButton>
          <DsButton variant="secondary" type="button" @click="resetCreateForm">Limpar</DsButton>
        </div>
      </form>
    </DsCard>

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
        <DsButton :loading="loading" @click="prepareSearch">Pesquisar</DsButton>
      </div>
      <p class="rh-page__hint">
        Use o código como chave estável em integrações. Desativar uma profissão impede novos vínculos sem apagar o
        histórico dos profissionais existentes.
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
        <small class="rh-page__code">{{ professionRow(row).code }}</small>
      </template>
      <template #cell-professionals="{ row }">
        {{ professionRow(row).professionals.join(', ') }}
      </template>
      <template #cell-open="{ row }">
        <DsButton size="sm" variant="secondary" @click="toggleProfession(professionRow(row))">
          {{ professionRow(row).status === 'active' ? 'Desativar' : 'Ativar' }}
        </DsButton>
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
import type { ProfessionSummary, StaffSummary } from '@cvg-his-v2/shared-types';

interface ProfessionRow {
  id: string;
  code: string;
  profession: string;
  description: string;
  status: 'active' | 'inactive';
  departments: string;
  activeCount: number;
  inactiveCount: number;
  professionals: string[];
  open: string;
}

const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const staff = ref<StaffSummary[]>([]);
const professions = ref<ProfessionSummary[]>([]);
const showCreateForm = ref(false);
const createForm = ref({ code: '', name: '', description: '' });
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
  return professions.value
    .map((profession) => {
      const members = staff.value.filter(
        (member) =>
          member.professionId === profession.id ||
          (!member.professionId && member.jobTitle?.trim() === profession.name)
      );
      return {
        id: profession.id,
        code: profession.code,
        profession: profession.name,
        description: profession.description ?? '',
        status: profession.status,
        departments: Array.from(new Set(members.map((member) => member.department).filter(Boolean))).join(', ') || '—',
        activeCount: members.filter((member) => member.status === 'active').length,
        inactiveCount: members.filter((member) => member.status !== 'active').length,
        professionals: members.map((member) => member.fullName).sort((left, right) => left.localeCompare(right)),
        open: profession.status === 'active' ? 'Desativar' : 'Ativar'
      };
    })
    .sort((left, right) => left.profession.localeCompare(right.profession));
});

const filteredRows = computed(() => {
  const description = filters.value.description.trim().toLowerCase();
  const linked = filters.value.linked.trim().toLowerCase();
  const rows = professionRows.value;

  return rows.filter((row) => {
    const matchesDescription =
      !description ||
      [row.code, row.profession, row.description].some((value) => value.toLowerCase().includes(description));
    const matchesLinked =
      !linked ||
      [row.departments, ...row.professionals].some((value) => value.toLowerCase().includes(linked));
    return matchesDescription && matchesLinked;
  }) as unknown as DataTableRow[];
});

const activeProfessionalsCount = computed(() =>
  staff.value.filter((member) => member.status === 'active' && member.professionId).length
);
const uncategorizedCount = computed(() => staff.value.filter((member) => !member.professionId).length);
const searchSummary = computed(() => {
  if (!searchSubmitted.value) return '';
  const description = filters.value.description.trim() || 'qualquer descrição';
  const linked = filters.value.linked.trim() || 'qualquer vínculo';
  return `Pesquisa aplicada para profissões com descrição ${description} e vínculo ${linked}.`;
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [staffItems, professionItems] = await Promise.all([
      staffService.list(),
      staffService.listProfessions()
    ]);
    staff.value = staffItems;
    professions.value = professionItems;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar profissões';
  } finally {
    loading.value = false;
  }
}

function prepareSearch() {
  searchSubmitted.value = true;
}

async function createProfession() {
  const code = createForm.value.code.trim();
  const name = createForm.value.name.trim();
  if (!code || !name) {
    error.value = 'Código e nome da profissão são obrigatórios';
    return;
  }
  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const created = await staffService.createProfession({
      code,
      name,
      description: createForm.value.description.trim() || null
    });
    professions.value = [...professions.value, created];
    successMessage.value = 'Profissão cadastrada com sucesso.';
    resetCreateForm();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao cadastrar profissão';
  } finally {
    submitting.value = false;
  }
}

async function toggleProfession(row: ProfessionRow) {
  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const updated = await staffService.toggleProfession(row.id, row.status !== 'active');
    professions.value = professions.value.map((profession) =>
      profession.id === updated.id ? updated : profession
    );
    successMessage.value = `Profissão ${updated.status === 'active' ? 'ativada' : 'desativada'} com sucesso.`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao alterar profissão';
  } finally {
    submitting.value = false;
  }
}

function resetCreateForm() {
  createForm.value = { code: '', name: '', description: '' };
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
