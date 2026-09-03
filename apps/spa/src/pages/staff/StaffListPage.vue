<template>
  <div class="list-page">
    <AppPageHeader
      title="Profissionais"
      :breadcrumbs="['RH', 'Cadastros', 'Profissionais']"
      subtitle="Cadastro beta de profissionais, funções, disponibilidade e produção operacional"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" @click="router.push('/staff/new')"
          >+ Incluir Novo Profissional</DsButton
        >
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície Vetus-like para a rota beta cadastro/profissionais, registrada no acervo como
      rh-profissionais-01.png. Profissional representa pessoa operacional de agenda, produção,
      folgas e comissões; usuário autenticável continua separado em RH / Usuários.
    </DsAlert>

    <section class="list-page__overview">
      <DsCard title="Resumo da equipe">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ staff.length }}</span>
            <span class="overview-metric__label">Profissionais cadastrados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ activeStaff }}</span>
            <span class="overview-metric__label">Ativos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ departmentsCount }}</span>
            <span class="overview-metric__label">Departamentos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ jobTitlesCount }}</span>
            <span class="overview-metric__label">Cargos distintos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ filteredStaff.length }}</span>
            <span class="overview-metric__label">Resultados atuais</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="list-page__toolbar">
      <DsCard title="Busca por ID ou nome" variant="compact">
        <DsInput
          v-model="search"
          aria-label="Buscar profissional por ID ou nome"
          placeholder="por ID ou nome"
        />
      </DsCard>
    </section>

    <section class="professional-cards" aria-label="Profissionais cadastrados">
      <article v-for="member in filteredStaff" :key="member.id" class="professional-card">
        <header class="professional-card__header">
          <div>
            <span class="professional-card__id">ID {{ member.id }}</span>
            <h2>{{ member.fullName }}</h2>
          </div>
          <span
            :class="[
              'status-badge',
              member.status === 'active' ? 'status-badge--active' : 'status-badge--inactive'
            ]"
          >
            {{ member.status === 'active' ? 'Ativo' : 'Inativo' }}
          </span>
        </header>

        <dl class="professional-card__facts">
          <div>
            <dt>Código</dt>
            <dd>{{ member.employeeCode }}</dd>
          </div>
          <div>
            <dt>Cargo</dt>
            <dd>{{ member.jobTitle || '—' }}</dd>
          </div>
          <div>
            <dt>Departamento</dt>
            <dd>{{ member.department || '—' }}</dd>
          </div>
        </dl>

        <details class="professional-card__contact">
          <summary>Informações de Contato</summary>
          <p>Contrato atual de profissionais não expõe telefone ou e-mail na listagem.</p>
        </details>

        <div class="professional-card__actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/staff/${member.id}`)">
            Ver Detalhes
          </DsButton>
        </div>
      </article>
    </section>

    <section class="list-page__story">
      <DsCard title="Leitura executiva">
        <div class="story-grid">
          <div v-for="card in storyCards" :key="card.label" class="story-card">
            <span class="story-card__label">{{ card.label }}</span>
            <strong class="story-card__value">{{ card.value }}</strong>
            <span class="story-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="list-page__actions">
      <DsCard title="Integrações do profissional" variant="compact">
        <div class="integration-grid">
          <article
            v-for="integration in integrations"
            :key="integration.title"
            class="integration-card"
          >
            <span>{{ integration.scope }}</span>
            <strong>{{ integration.title }}</strong>
            <p>{{ integration.description }}</p>
          </article>
        </div>
        <div class="quick-actions">
          <DsButton tag="a" to="/appointments" variant="primary">Agenda</DsButton>
          <DsButton tag="a" to="/time-off" variant="secondary">Folgas</DsButton>
          <DsButton tag="a" to="/commission-calculations" variant="secondary">Comissões</DsButton>
          <DsButton tag="a" to="/commission-rules" variant="secondary">Regras de Comissão</DsButton>
          <DsButton tag="a" to="/users" variant="secondary">Usuários</DsButton>
          <DsButton tag="a" to="/access-control" variant="secondary">Grupos de Acesso</DsButton>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="staffRows"
      :loading="loading"
      empty-icon="👨‍⚕️"
      empty-title="Nenhum membro encontrado"
      empty-description="Cadastre o primeiro profissional ou ajuste os filtros."
      variant="hoverable"
    >
      <template #cell-fullName="{ row }">
        {{ staffRow(row).fullName }}
      </template>
      <template #cell-employeeCode="{ row }">
        {{ staffRow(row).employeeCode }}
      </template>
      <template #cell-department="{ row }">
        {{ staffRow(row).department || '—' }}
      </template>
      <template #cell-jobTitle="{ row }">
        {{ staffRow(row).jobTitle || '—' }}
      </template>
      <template #cell-status="{ row }">
        <span
          :class="[
            'status-badge',
            staffRow(row).status === 'active' ? 'status-badge--active' : 'status-badge--inactive'
          ]"
        >
          {{ staffRow(row).status === 'active' ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton
            size="sm"
            variant="secondary"
            @click="router.push(`/staff/${staffRow(row).id}`)"
          >
            Ver Detalhes
          </DsButton>
          <DsButton
            size="sm"
            variant="secondary"
            @click="router.push(`/staff/${staffRow(row).id}/edit`)"
          >
            Editar
          </DsButton>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { staffService } from '@/services/staff';
import type { StaffSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';

const router = useRouter();
const staff = ref<StaffSummary[]>([]);
const loading = ref(false);
const error = ref('');
const search = ref('');

const columns: DataTableColumn[] = [
  { key: 'fullName', label: 'Nome' },
  { key: 'employeeCode', label: 'Código' },
  { key: 'department', label: 'Departamento' },
  { key: 'jobTitle', label: 'Cargo' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const activeStaff = computed(
  () => staff.value.filter((member) => member.status === 'active').length
);
const filteredStaff = computed(() => {
  const needle = search.value.trim().toLowerCase();
  if (!needle) return staff.value;
  return staff.value.filter((member) =>
    [member.id, member.employeeCode, member.fullName, member.department, member.jobTitle].some(
      (value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(needle)
    )
  );
});
const staffRows = computed(() => filteredStaff.value as unknown as DataTableRow[]);
const departmentsCount = computed(
  () => new Set(staff.value.map((member) => member.department).filter(Boolean)).size
);
const jobTitlesCount = computed(
  () => new Set(staff.value.map((member) => member.jobTitle).filter(Boolean)).size
);
const storyCards = computed(() => [
  {
    label: 'Ativos',
    value: activeStaff.value.toString(),
    hint: 'Membros disponíveis para operação'
  },
  {
    label: 'Departamentos',
    value: departmentsCount.value.toString(),
    hint: 'Áreas diferentes identificadas'
  },
  {
    label: 'Cargos',
    value: jobTitlesCount.value.toString(),
    hint: 'Distribuição funcional'
  },
  {
    label: 'Cobertura',
    value: staff.value.length
      ? `${Math.round((activeStaff.value / staff.value.length) * 100)}%`
      : '0%',
    hint: 'Percentual de membros ativos'
  }
]);

const integrations = [
  {
    scope: 'Disponibilidade',
    title: 'Agenda',
    description: 'Profissional define alocação, agenda por coluna e execução clínica.'
  },
  {
    scope: 'Escala',
    title: 'Folgas',
    description: 'Indisponibilidades formais impactam agenda e cobertura operacional.'
  },
  {
    scope: 'Produtividade',
    title: 'Comissões',
    description: 'Cálculo usa profissional, regra vigente e fatos de produção.'
  },
  {
    scope: 'Cadastro mestre',
    title: 'Profissões',
    description: 'Classifica função, filtra relatórios e sustenta regras por papel.'
  }
];

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    staff.value = await staffService.list();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar equipe';
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);

function staffRow(row: unknown): StaffSummary {
  return row as StaffSummary;
}
</script>

<style scoped>
.list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-page__overview {
  margin-bottom: 4px;
}

.list-page__story {
  margin-bottom: 4px;
}

.list-page__toolbar {
  margin-bottom: 4px;
}

.list-page__actions {
  margin-bottom: 4px;
}

.professional-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.professional-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.professional-card__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.professional-card__header h2 {
  margin: 2px 0 0;
  font-size: 18px;
  line-height: 1.25;
}

.professional-card__id {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted, #64748b);
}

.professional-card__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin: 0;
}

.professional-card__facts div {
  min-width: 0;
}

.professional-card__facts dt {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted, #64748b);
}

.professional-card__facts dd {
  margin: 2px 0 0;
  color: var(--color-text, #0f172a);
}

.professional-card__contact {
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding-top: 10px;
}

.professional-card__contact summary {
  cursor: pointer;
  font-weight: 700;
}

.professional-card__contact p {
  margin: 8px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

.professional-card__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(
    180deg,
    var(--color-surface, #ffffff),
    var(--color-bg-subtle, #f8fafc)
  );
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.story-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(
    180deg,
    var(--color-surface, #ffffff),
    var(--color-bg-subtle, #f8fafc)
  );
}

.story-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.story-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.story-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.integration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}

.integration-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}

.integration-card span {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.integration-card p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-text-muted, #64748b);
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge--active {
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
}

.status-badge--inactive {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-600, #475569);
}
</style>
