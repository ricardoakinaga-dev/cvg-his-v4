<template>
  <div class="finance-catalog-page">
    <AppPageHeader
      title="Cartões"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Cartões']"
      subtitle="Estrutura inicial para cartões, bandeiras e contas administrativas ligadas à operação financeira"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">Novo Cartão</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície inicial para <strong>Financeiro &gt; Cadastros &gt; Cartões</strong>, inspirada nas rotinas legacy de
      administradora, bandeira, taxas e contas a receber por cartão do Vetus.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${cards.length} cartão(ões)`" value="" icon="💳" />
      <DsStatCard :label="`${receivableCount} com conta a receber`" value="" icon="📥" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
    </section>

    <DsCard title="Cartões, bandeiras e contas administrativas">
      <div class="catalog-toolbar">
        <input v-model="query" type="search" placeholder="Buscar por cartão, bandeira ou administradora" class="catalog-search" />
        <div class="catalog-toolbar__actions">
          <DsButton variant="secondary">Pesquisar</DsButton>
          <DsButton variant="ghost">Baixa em Lote</DsButton>
        </div>
      </div>

      <div class="catalog-grid">
        <article v-for="card in filteredCards" :key="card.code" class="catalog-item">
          <div class="catalog-item__head">
            <strong>{{ card.label }}</strong>
            <span class="catalog-item__badge" :class="{ 'catalog-item__badge--active': card.active }">
              {{ card.active ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <p class="catalog-item__meta">Bandeira: {{ card.brand }} · Administradora: {{ card.operator }}</p>
          <p class="catalog-item__hint">{{ card.description }}</p>
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
const cards = ref([
  {
    code: 'visa_credit',
    label: 'Visa Crédito',
    brand: 'Visa',
    operator: 'Cielo',
    active: true,
    receivable: true,
    description: 'Base para recebíveis de crédito com taxa administrativa e conciliação futura.'
  },
  {
    code: 'master_debit',
    label: 'Master Débito',
    brand: 'Mastercard',
    operator: 'Stone',
    active: true,
    receivable: false,
    description: 'Operação imediata vinculada à maquininha e conferência de liquidação diária.'
  },
  {
    code: 'elo_credit',
    label: 'Elo Crédito',
    brand: 'Elo',
    operator: 'Rede',
    active: false,
    receivable: true,
    description: 'Estrutura pronta para contas administrativas e controle de taxas por operadora.'
  }
]);

const filteredCards = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  if (!normalized) {
    return cards.value;
  }

  return cards.value.filter((card) => {
    return [card.label, card.brand, card.operator].join(' ').toLowerCase().includes(normalized);
  });
});

const receivableCount = computed(() => cards.value.filter((item) => item.receivable).length);
const activeCount = computed(() => cards.value.filter((item) => item.active).length);

function reload() {
  cards.value = [...cards.value];
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

.catalog-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.catalog-item {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  padding: 14px;
  background: var(--color-surface, #fff);
}

.catalog-item__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.catalog-item__badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
}

.catalog-item__badge--active {
  background: #dcfce7;
  color: #15803d;
}

.catalog-item__meta {
  margin: 10px 0 6px;
  font-size: 13px;
  color: #475569;
}

.catalog-item__hint {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}
</style>
