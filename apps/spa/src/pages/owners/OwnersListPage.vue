<template>
  <div class="owners-list-page">
    <AppPageHeader title="Tutores" subtitle="Cadastro mestre de responsáveis por pacientes">
      <template #actions>
        <router-link to="/owners/new" class="btn btn--primary">+ Novo Tutor</router-link>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <input
        v-model="search"
        type="search"
        class="search-bar__input"
        placeholder="Buscar por nome, documento ou contato..."
        @keyup.enter="load"
      />
      <button class="btn btn--secondary" @click="load">Buscar</button>
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
        <router-link to="/owners/new" class="btn btn--primary">+ Novo Tutor</router-link>
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
        <router-link :to="`/owners/${(row as OwnerSummary).id}`" class="btn btn--sm btn--secondary"
          >Ver</router-link
        >
        <router-link
          :to="`/owners/${(row as OwnerSummary).id}/edit`"
          class="btn btn--sm btn--secondary"
          >Editar</router-link
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
