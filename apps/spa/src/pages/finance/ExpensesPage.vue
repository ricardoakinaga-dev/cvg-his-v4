<template>
  <div class="finance-catalog-page">
    <AppPageHeader
      title="Custos e Despesas"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Custos e Despesas']"
      subtitle="Cadastro inicial para despesas administrativas, operacionais e lançamentos de apoio ao resultado financeiro"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">+ Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Estrutura inicial para <strong>Financeiro &gt; Cadastros &gt; Custos e Despesas</strong>, inspirada no legado Vetus.
      Busca simples, tabela leve e categorias básicas materializam a seção sem depender de backend completo.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${expenses.length} registro(s)`" value="" icon="🧾" />
      <DsStatCard :label="`${fixedCount} fixo(s)`" value="" icon="📌" />
      <DsStatCard :label="`${operationalCount} operacional(is)`" value="" icon="🏥" />
    </section>

    <DsCard title="Cadastro de custos e despesas">
      <div class="catalog-toolbar catalog-toolbar--three">
        <input v-model="filters.id" type="search" placeholder="Id" class="catalog-search" />
        <input v-model="filters.name" type="search" placeholder="Nome" class="catalog-search" />
        <input v-model="filters.description" type="search" placeholder="Descrição" class="catalog-search" />
      </div>

      <div class="catalog-toolbar__actions catalog-toolbar__actions--bottom">
        <DsButton variant="secondary">Pesquisar</DsButton>
      </div>

      <div v-if="filteredExpenses.length === 0" class="catalog-empty">
        Nenhum registro encontrado.
      </div>

      <table v-else class="catalog-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Abrir</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expense in filteredExpenses" :key="expense.id">
            <td>{{ expense.id }}</td>
            <td>{{ expense.name }}</td>
            <td>{{ expense.description }}</td>
            <td><DsButton variant="secondary">Abrir</DsButton></td>
          </tr>
        </tbody>
      </table>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

const filters = reactive({
  id: '',
  name: '',
  description: ''
});

const expenses = ref([
  {
    id: 'DES-101',
    name: 'Energia Elétrica',
    kind: 'Fixo',
    description: 'Despesa estrutural da operação com rateio futuro por unidade e centro de custo.'
  },
  {
    id: 'DES-214',
    name: 'Frete de Suprimentos',
    kind: 'Operacional',
    description: 'Custo ligado à reposição de estoque, compras externas e entregas de laboratório.'
  },
  {
    id: 'DES-318',
    name: 'Licenças de Software',
    kind: 'Fixo',
    description: 'Base administrativa para serviços digitais, integrações e tecnologia de apoio.'
  }
]);

const filteredExpenses = computed(() => {
  return expenses.value.filter((expense) => {
    const idMatch = !filters.id || expense.id.toLowerCase().includes(filters.id.toLowerCase());
    const nameMatch = !filters.name || expense.name.toLowerCase().includes(filters.name.toLowerCase());
    const descriptionMatch = !filters.description || expense.description.toLowerCase().includes(filters.description.toLowerCase());
    return idMatch && nameMatch && descriptionMatch
  });
});

const fixedCount = computed(() => expenses.value.filter((item) => item.kind === 'Fixo').length);
const operationalCount = computed(() => expenses.value.filter((item) => item.kind === 'Operacional').length);

function reload() {
  expenses.value = [...expenses.value];
}
</script>

<style scoped>
.finance-catalog-page {
  display: grid;
  gap: 16px;
}

.catalog-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.catalog-toolbar {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.catalog-toolbar--three {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.catalog-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.catalog-toolbar__actions--bottom {
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

.catalog-table {
  width: 100%;
  border-collapse: collapse;
}

.catalog-table th,
.catalog-table td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  vertical-align: top;
}

.catalog-table th {
  font-size: 13px;
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
