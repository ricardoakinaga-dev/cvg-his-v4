<template>
  <div class="inventory-catalog-page">
    <AppPageHeader
      title="Fornecedores"
      :breadcrumbs="['Estoque', 'Cadastrados', 'Fornecedores']"
      subtitle="Base inicial de fornecedores e despesas conectada ao abastecimento, compras e catálogo operacional"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">+ Incluir Novo Registro</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície inicial para <strong>Estoque &gt; Cadastrados &gt; Fornecedores</strong>, inspirada no benchmark Vetus.
      Busca avançada, filtros detalhados e vínculo pleno com despesas entram nas próximas ondas.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${suppliers.length} registro(s)`" value="" icon="🏭" />
      <DsStatCard :label="`${supplierCount} fornecedor(es)`" value="" icon="🚚" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${withContactCount} com contato`" value="" icon="📞" />
    </section>

    <DsCard title="Fornecedores e despesas do abastecimento">
      <div class="catalog-toolbar">
        <input v-model="query" type="search" placeholder="Buscar por ID ou descrição" class="catalog-search" />
        <div class="catalog-toolbar__actions">
          <DsButton variant="secondary">Busca Avançada</DsButton>
          <DsButton variant="ghost">Filtrar e Ordenar</DsButton>
        </div>
      </div>

      <div class="catalog-results-meta">Mostrando {{ filteredSuppliers.length }} resultado(s) da base operacional inicial.</div>

      <div v-if="filteredSuppliers.length === 0" class="catalog-empty">
        Nenhum registro encontrado.
      </div>

      <div v-else class="catalog-list">
        <article v-for="supplier in filteredSuppliers" :key="supplier.id" class="catalog-card">
          <div class="catalog-card__main">
            <strong>{{ supplier.name }}</strong>
            <p><span>Categoria:</span> {{ supplier.category }}</p>
            <p><span>Contato:</span> {{ supplier.contact }}</p>
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
const suppliers = ref([
  {
    id: 'SUP-1024',
    name: 'Adimax Indústria e Comércio de Alimentos',
    category: 'Fornecedor',
    kind: 'supplier',
    active: true,
    contact: 'Sem contato · origem NFE'
  },
  {
    id: 'SUP-0872',
    name: 'Centerlab Central de Laboratórios',
    category: 'Fornecedor',
    kind: 'supplier',
    active: true,
    contact: 'contato@centerlab.test'
  },
  {
    id: 'DES-0018',
    name: 'Despesas de Frete Refrigerado',
    category: 'Despesa',
    kind: 'expense',
    active: false,
    contact: 'Sem contato operacional'
  }
]);

const filteredSuppliers = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  if (!normalized) {
    return suppliers.value;
  }

  return suppliers.value.filter((supplier) => {
    return [supplier.id, supplier.name, supplier.category, supplier.contact]
      .join(' ')
      .toLowerCase()
      .includes(normalized);
  });
});

const supplierCount = computed(() => suppliers.value.filter((item) => item.kind === 'supplier').length);
const activeCount = computed(() => suppliers.value.filter((item) => item.active).length);
const withContactCount = computed(() => suppliers.value.filter((item) => !item.contact.toLowerCase().includes('sem contato')).length);

function reload() {
  suppliers.value = [...suppliers.value];
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

.catalog-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.catalog-results-meta {
  margin-bottom: 12px;
  font-size: 13px;
  color: #64748b;
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
