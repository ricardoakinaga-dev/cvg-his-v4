<template>
  <div class="inventory-catalog-page">
    <AppPageHeader
      title="Estoques"
      :breadcrumbs="['Estoque', 'Cadastrados', 'Estoques']"
      subtitle="Cadastros físicos e lógicos que sustentam almoxarifado, laboratório, clínica e geladeiras de insumos"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">+ Incluir Novo Estoque</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Estrutura inicial de <strong>Estoque &gt; Cadastrados &gt; Estoques</strong> com cards simples, busca e CTA prioritário,
      seguindo o padrão visual observado no Vetus.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${warehouses.length} estoque(s)`" value="" icon="🏬" />
      <DsStatCard :label="`${clinicalCount} clínico(s)`" value="" icon="🏥" />
      <DsStatCard :label="`${coldChainCount} cadeia fria`" value="" icon="❄️" />
    </section>

    <DsCard title="Estruturas de estoque cadastradas">
      <div class="catalog-toolbar">
        <input v-model="query" type="search" placeholder="Buscar por ID ou descrição" class="catalog-search" />
      </div>

      <div v-if="filteredWarehouses.length === 0" class="catalog-empty">
        Nenhum registro encontrado.
      </div>

      <div v-else class="catalog-list">
        <article v-for="warehouse in filteredWarehouses" :key="warehouse.id" class="catalog-card">
          <div class="catalog-card__main">
            <p><span>Descrição:</span> {{ warehouse.name }}</p>
            <p><span>ID:</span> {{ warehouse.id }}</p>
          </div>
          <DsButton variant="secondary">Ver Detalhes</DsButton>
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
const warehouses = ref([
  { id: 17, name: 'Geladeira Vacinas', profile: 'cold-chain' },
  { id: 14, name: 'Armário Cinza Clínica', profile: 'clinical' },
  { id: 13, name: 'Armário Branco Clínica', profile: 'clinical' },
  { id: 11, name: 'Laboratório', profile: 'lab' }
]);

const filteredWarehouses = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  if (!normalized) {
    return warehouses.value;
  }

  return warehouses.value.filter((warehouse) => `${warehouse.id} ${warehouse.name}`.toLowerCase().includes(normalized));
});

const clinicalCount = computed(() => warehouses.value.filter((item) => item.profile === 'clinical').length);
const coldChainCount = computed(() => warehouses.value.filter((item) => item.profile === 'cold-chain').length);

function reload() {
  warehouses.value = [...warehouses.value];
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

.catalog-list {
  display: grid;
  gap: 12px;
}

.catalog-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  padding: 16px;
  background: var(--color-surface, #fff);
}

.catalog-card__main {
  display: grid;
  gap: 6px;
}

.catalog-card__main p {
  margin: 0;
  color: #475569;
}

.catalog-card__main span {
  font-weight: 600;
}

.catalog-empty {
  border: 1px dashed var(--color-border, #cbd5e1);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  color: #64748b;
}
</style>
