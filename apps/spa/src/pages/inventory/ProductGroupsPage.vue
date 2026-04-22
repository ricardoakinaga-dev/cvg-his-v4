<template>
  <div class="inventory-catalog-page">
    <AppPageHeader
      title="Grupos de Produto"
      :breadcrumbs="['Estoque', 'Cadastrados', 'Grupos de Produto']"
      subtitle="Classificação inicial do catálogo para apoiar preço, fiscal, estoque e leitura gerencial"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">+ Incluir Novo Grupo</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Estrutura inicial inspirada na navegação Vetus para <strong>Estoque &gt; Cadastrados &gt; Grupos de Produto</strong>.
      A camada futura pode conectar grupos a fiscal, margem, comissões e relatórios.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${groups.length} grupo(s)`" value="" icon="🗂️" />
      <DsStatCard :label="`${criticalCount} crítico(s)`" value="" icon="⚠️" />
      <DsStatCard :label="`${linkedCount} com vínculo fiscal`" value="" icon="📋" />
    </section>

    <DsCard title="Grupos publicados no catálogo">
      <div class="catalog-toolbar">
        <input v-model="query" type="search" placeholder="Buscar por ID ou descrição" class="catalog-search" />
      </div>

      <div v-if="filteredGroups.length === 0" class="catalog-empty">
        Nenhum registro encontrado.
      </div>

      <div v-else class="catalog-list">
        <article v-for="group in filteredGroups" :key="group.id" class="catalog-card">
          <div class="catalog-card__main">
            <p><span>Descrição:</span> {{ group.name }}</p>
            <p><span>ID:</span> {{ group.id }}</p>
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
const groups = ref([
  { id: 10, name: 'Produtos de Limpeza e Copa', critical: false, fiscalLinked: false },
  { id: 9, name: 'Farmácia', critical: true, fiscalLinked: true },
  { id: 8, name: 'Itens Recepção', critical: false, fiscalLinked: false },
  { id: 4, name: 'Vacinas', critical: true, fiscalLinked: true }
]);

const filteredGroups = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  if (!normalized) {
    return groups.value;
  }

  return groups.value.filter((group) => `${group.id} ${group.name}`.toLowerCase().includes(normalized));
});

const criticalCount = computed(() => groups.value.filter((item) => item.critical).length);
const linkedCount = computed(() => groups.value.filter((item) => item.fiscalLinked).length);

function reload() {
  groups.value = [...groups.value];
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
