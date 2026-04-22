<template>
  <div class="finance-catalog-page">
    <AppPageHeader
      title="Formas de Pagamento"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Formas de Pagamento']"
      subtitle="Base operacional dos meios de pagamento usados em faturamento, caixa, PIX e balcão"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">Nova Forma</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Estrutura inicial publicada para materializar <strong>Financeiro &gt; Cadastros</strong>. Edição completa,
      regras avançadas e conciliação ainda serão expandidas nas próximas ondas.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${paymentMethods.length} forma(s)`" value="" icon="💳" />
      <DsStatCard :label="`${activeCount} ativa(s)`" value="" icon="✅" />
      <DsStatCard :label="`${digitalCount} digital(is)`" value="" icon="📲" />
    </section>

    <DsCard title="Catálogo inicial de meios de pagamento">
      <div class="catalog-grid">
        <article v-for="method in paymentMethods" :key="method.code" class="catalog-item">
          <div class="catalog-item__head">
            <strong>{{ method.label }}</strong>
            <span class="catalog-item__badge" :class="{ 'catalog-item__badge--active': method.active }">
              {{ method.active ? 'Ativa' : 'Inativa' }}
            </span>
          </div>
          <p class="catalog-item__meta">Código: {{ method.code }} · Tipo: {{ method.kind }}</p>
          <p class="catalog-item__hint">{{ method.description }}</p>
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

const paymentMethods = ref([
  {
    code: 'cash',
    label: 'Dinheiro',
    kind: 'Presencial',
    active: true,
    description: 'Recebimento físico vinculado à rotina de caixa e fechamento de gaveta.'
  },
  {
    code: 'pix',
    label: 'PIX',
    kind: 'Digital',
    active: true,
    description: 'Pagamento instantâneo integrado à trilha de intent e conferência operacional.'
  },
  {
    code: 'card_credit',
    label: 'Cartão de Crédito',
    kind: 'Digital',
    active: true,
    description: 'Pagamento conciliado com a futura camada de maquininha e transações.'
  },
  {
    code: 'invoice',
    label: 'Faturamento a Prazo',
    kind: 'Cobrança',
    active: false,
    description: 'Estrutura inicial para recebíveis e contas a receber em ondas futuras.'
  }
]);

const activeCount = computed(() => paymentMethods.value.filter((item) => item.active).length);
const digitalCount = computed(() => paymentMethods.value.filter((item) => item.kind === 'Digital').length);

function reload() {
  paymentMethods.value = [...paymentMethods.value];
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
