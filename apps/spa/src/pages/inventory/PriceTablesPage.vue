<template>
  <div class="price-tables-page">
    <AppPageHeader
      title="Tabelas de Preço"
      :breadcrumbs="['Estoque', 'Cadastros', 'Tabelas de Preço']"
      subtitle="Políticas comerciais reutilizáveis para produtos e serviços"
    >
      <template #actions>
        <DsButton variant="primary">+ Incluir Nova Tabela</DsButton>
      </template>
    </AppPageHeader>

    <DsCard title="Quer cadastrar tabelas de preço de forma prática?" class="panel">
      <p class="support-copy">
        A rotina confirma que preço é uma camada parametrizável, não apenas um atributo fixo do item.
      </p>
      <DsInput v-model="query" label="Buscar por ID ou descrição" placeholder="Buscar por ID ou descrição" />
    </DsCard>

    <section class="price-tables-page__layout">
      <DsCard title="Tabelas cadastradas" class="panel">
        <div class="price-table-list">
          <article v-for="table in filteredTables" :key="table.id" class="price-table-card">
            <div>
              <span>Descrição</span>
              <strong>{{ table.description }}</strong>
            </div>
            <div>
              <span>ID</span>
              <strong>{{ table.id }}</strong>
            </div>
            <DsButton size="sm" variant="secondary">Ver Detalhes</DsButton>
          </article>
        </div>
        <div v-if="isLoading" class="empty-state">Carregando tabelas de preço...</div>
        <div v-if="errorMessage" class="empty-state">{{ errorMessage }}</div>
        <div v-if="!isLoading && !errorMessage && filteredTables.length === 0" class="empty-state">
          Nenhuma tabela encontrada.
        </div>
      </DsCard>

      <DsCard title="Aplicação transversal" class="panel">
        <div class="integration-grid">
          <article v-for="integration in integrations" :key="integration.title" class="integration-card">
            <span>{{ integration.scope }}</span>
            <strong>{{ integration.title }}</strong>
            <p>{{ integration.description }}</p>
          </article>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { listPriceTables, type PriceTableSummary } from '@/services/commercial';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const query = ref('');
const priceTables = ref<readonly PriceTableSummary[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');

const integrations = [
  {
    scope: 'Catálogo',
    title: 'Produtos',
    description: 'Produtos podem receber tabelas alternativas por canal, turno ou campanha.'
  },
  {
    scope: 'Catálogo',
    title: 'Serviços',
    description: 'Serviços usam a tabela para separar valor padrão de regras especiais.'
  },
  {
    scope: 'Operação',
    title: 'Consulta de preços',
    description: 'A política de preço precisa ser consultável antes de comanda, venda ou PDV.'
  }
];

const filteredTables = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return priceTables.value;
  return priceTables.value.filter((table) =>
    [table.id, table.legacyId ?? '', table.description, table.context ?? ''].some((value) =>
      value.toLowerCase().includes(needle)
    )
  );
});

async function loadPriceTables() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    priceTables.value = await listPriceTables();
  } catch {
    errorMessage.value = 'Não foi possível carregar as tabelas de preço.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadPriceTables();
});
</script>

<style scoped>
.price-tables-page {
  display: grid;
  gap: 16px;
}

.panel {
  border-radius: 18px;
}

.support-copy {
  margin: 0 0 12px;
  color: var(--color-text-muted, #64748b);
}

.price-tables-page__layout,
.integration-grid {
  display: grid;
  gap: 12px;
}

.price-tables-page__layout {
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
}

.price-table-list {
  display: grid;
  gap: 12px;
}

.empty-state {
  padding: 16px;
  color: var(--color-text-muted, #64748b);
}

.price-table-card,
.integration-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}

.price-table-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 100px auto;
  gap: 12px;
  align-items: center;
}

.price-table-card span,
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
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 960px) {
  .price-tables-page__layout,
  .price-table-card {
    grid-template-columns: 1fr;
  }
}
</style>
