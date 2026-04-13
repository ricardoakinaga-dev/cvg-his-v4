<template>
  <div class="owners-list-page">
    <AppPageHeader
      title="Tutores"
      subtitle="Atendimento > Cadastrados > Tutores. Responsáveis pelos pacientes que seguem para agenda, atendimento e prontuário."
    >
      <template #actions>
        <DsButton tag="a" to="/owners/new" variant="primary">+ Novo Tutor</DsButton>
        <DsButton tag="a" to="/patients" variant="secondary">🐾 Ver Pacientes</DsButton>
        <DsButton tag="a" to="/appointments" variant="ghost">📅 Agenda</DsButton>
      </template>
    </AppPageHeader>

    <section class="summary-grid">
      <DsCard v-for="card in summaryCards" :key="card.label" variant="elevated" class="summary-card">
        <div class="summary-card__icon">{{ card.icon }}</div>
        <div class="summary-card__body">
          <span class="summary-card__value">{{ card.value }}</span>
          <span class="summary-card__label">{{ card.label }}</span>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <DsInput
        v-model="search"
        type="search"
        placeholder="Buscar por nome, documento ou contato..."
        @keyup.enter="load"
      />
      <DsButton variant="secondary" @click="load">Buscar</DsButton>
    </div>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="👥"
      empty-title="Nenhum tutor encontrado"
      empty-description="Cadastre o primeiro tutor para vincular pacientes e sustentar agenda, atendimento e prontuário."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton tag="a" to="/owners/new" variant="primary">+ Novo Tutor</DsButton>
      </template>
      <template #cell-name="{ row }">
        <strong>{{ (row as OwnerSummary).fullName }}</strong>
      </template>
      <template #cell-document="{ row }">
        <code v-if="(row as OwnerSummary).documentId">{{ (row as OwnerSummary).documentId }}</code>
        <span v-else class="muted">—</span>
      </template>
      <template #cell-contact="{ row }">
        {{ primaryContact(row as OwnerSummary) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="ownerStatusLabel((row as OwnerSummary).status)"
          :variant="(row as OwnerSummary).status === 'active' ? 'success' : 'danger'"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton tag="a" :to="`/owners/${(row as OwnerSummary).id}`" size="sm" variant="secondary"
          >Ver</DsButton
        >
        <DsButton
          tag="a"
          :to="`/owners/${(row as OwnerSummary).id}/edit`"
          size="sm"
          variant="secondary"
          >Editar</DsButton
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ownerService } from '@/services/owner';
import type { OwnerSummary, OwnerContact } from '@/types/owner';
import { ownerStatusLabel } from '@/utils/labels';
import { useListData } from '@/composables/useListData';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const { items, loading, error, search, load } = useListData<OwnerSummary>({
  fetchFn: (q) => ownerService.list(q),
  entityLabel: 'tutores',
  withSearch: true
});

const summaryCards = computed(() => {
  const total = items.value.length;
  const active = items.value.filter((owner) => owner.status === 'active').length;
  const financial = items.value.filter((owner) => owner.financialResponsible).length;
  const withContacts = items.value.filter((owner) => owner.contacts.length > 0).length;

  return [
    { icon: '👥', label: 'Total de tutores', value: String(total) },
    { icon: '✅', label: 'Ativos', value: String(active) },
    { icon: '💰', label: 'Resp. financeiros', value: String(financial) },
    { icon: '☎️', label: 'Com contato', value: String(withContacts) }
  ];
});

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'document', label: 'Documento' },
  { key: 'contact', label: 'Contato' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

function primaryContact(owner: OwnerSummary): string {
  const contact = (owner.contacts as OwnerContact[]).find((c) => c.primary) || owner.contacts[0];
  return contact ? contact.value : '—';
}
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
}

.summary-card__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.08);
  font-size: 22px;
}

.summary-card__body {
  display: flex;
  flex-direction: column;
}

.summary-card__value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1;
}

.summary-card__label {
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
  margin-top: 4px;
}
</style>
