<template>
  <div class="owners-list-page">
    <AppPageHeader title="Tutores" subtitle="Cadastro mestre de responsáveis por pacientes">
      <template #actions>
        <DsButton tag="a" to="/owners/new" variant="primary">+ Novo Tutor</DsButton>
      </template>
    </AppPageHeader>

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
      empty-description="Cadastre o primeiro tutor para começar."
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
import { ownerService } from '@/services/owner';
import type { OwnerSummary, OwnerContact } from '@/types/owner';
import { ownerStatusLabel } from '@/utils/labels';
import { useListData } from '@/composables/useListData';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const { items, loading, error, search, load } = useListData<OwnerSummary>({
  fetchFn: (q) => ownerService.list(q),
  entityLabel: 'tutores',
  withSearch: true
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
