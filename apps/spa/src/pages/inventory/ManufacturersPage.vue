<template>
  <div class="inventory-catalog-page">
    <AppPageHeader
      title="Fabricantes"
      :breadcrumbs="['Estoque', 'Cadastrados', 'Fabricantes']"
      subtitle="Catálogo inicial de marcas e fabricantes que estruturam o portfólio de produtos do estoque"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">+ Incluir Novo Fabricante</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície inicial para <strong>Estoque &gt; Cadastrados &gt; Fabricantes</strong>. A versão Vetus prioriza busca simples,
      CTA claro e estado vazio amigável; esta primeira entrega segue essa mesma direção.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${manufacturers.length} fabricante(s)`" value="" icon="🏷️" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${nationalCount} nacional(is)`" value="" icon="🇧🇷" />
    </section>

    <DsCard title="Fabricantes vinculados ao catálogo de produtos">
      <div class="catalog-toolbar">
        <input v-model="query" type="search" placeholder="Buscar por ID ou nome" class="catalog-search" />
      </div>

      <div v-if="filteredManufacturers.length === 0" class="catalog-empty">
        Nenhum registro encontrado.
      </div>

      <div v-else class="catalog-grid">
        <article v-for="manufacturer in filteredManufacturers" :key="manufacturer.id" class="catalog-item">
          <strong>{{ manufacturer.name }}</strong>
          <p>ID: {{ manufacturer.id }}</p>
          <p>Origem: {{ manufacturer.origin }}</p>
        </article>
      </div>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

const query = ref('');
const manufacturers = ref([
  { id: 'FAB-001', name: 'Vetnil', origin: 'Nacional', active: true },
  { id: 'FAB-002', name: 'Zoetis', origin: 'Internacional', active: true },
  { id: 'FAB-003', name: 'Avert Saúde Animal', origin: 'Nacional', active: false }
]);

const filteredManufacturers = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  if (!normalized) {
    return manufacturers.value;
  }

  return manufacturers.value.filter((manufacturer) => {
    return [manufacturer.id, manufacturer.name, manufacturer.origin].join(' ').toLowerCase().includes(normalized);
  });
});

const activeCount = computed(() => manufacturers.value.filter((item) => item.active).length);
const nationalCount = computed(() => manufacturers.value.filter((item) => item.origin === 'Nacional').length);

function reload() {
  manufacturers.value = [...manufacturers.value];
}
</script>

<style scoped>
.inventory-catalog-page {
  display: grid;
  gap: 16px;
}

.catalog-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.catalog-toolbar {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.catalog-search {
  width: 100%;
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #dbe3ef);
  padding: 0 14px;
  background: var(--color-surface, #fff);
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.catalog-item {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  padding: 16px;
  background: var(--color-surface, #fff);
  display: grid;
  gap: 8px;
}

.catalog-item p {
  margin: 0;
  color: #475569;
}

.catalog-empty {
  border: 1px dashed var(--color-border, #cbd5e1);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  color: #64748b;
}
</style>
