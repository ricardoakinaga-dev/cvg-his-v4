<template>
  <div class="finance-catalog-page">
    <AppPageHeader
      title="Bancos"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Bancos']"
      subtitle="Estrutura inicial de contas bancárias e instituições ligadas ao financeiro operacional"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">Novo Banco</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície inicial para <strong>Financeiro &gt; Cadastros &gt; Bancos</strong>. Integrações de extrato,
      conciliação e conta bancária detalhada entram em próximas ondas.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${banks.length} banco(s)`" value="" icon="🏦" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${settlementCount} usado(s) em liquidação`" value="" icon="💸" />
    </section>

    <DsCard title="Instituições e contexto operacional">
      <div class="catalog-grid">
        <article v-for="bank in banks" :key="bank.code" class="catalog-item">
          <div class="catalog-item__head">
            <strong>{{ bank.name }}</strong>
            <span class="catalog-item__badge" :class="{ 'catalog-item__badge--active': bank.active }">
              {{ bank.active ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <p class="catalog-item__meta">Código: {{ bank.code }} · Uso: {{ bank.usage }}</p>
          <p class="catalog-item__hint">{{ bank.description }}</p>
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

const banks = ref([
  {
    code: '001',
    name: 'Banco do Brasil',
    usage: 'Liquidação e recebíveis',
    active: true,
    description: 'Base sugerida para repasses, TED e contas operacionais da clínica.'
  },
  {
    code: '237',
    name: 'Bradesco',
    usage: 'Cartão e cobrança',
    active: true,
    description: 'Estrutura preparada para futuras conciliações com maquininha e cobrança.'
  },
  {
    code: '341',
    name: 'Itaú',
    usage: 'Conta corrente de apoio',
    active: false,
    description: 'Exemplo de conta auxiliar ainda não ativada na operação.'
  }
]);

const activeCount = computed(() => banks.value.filter((item) => item.active).length);
const settlementCount = computed(() => banks.value.filter((item) => item.usage.includes('Liquidação')).length);

function reload() {
  banks.value = [...banks.value];
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
