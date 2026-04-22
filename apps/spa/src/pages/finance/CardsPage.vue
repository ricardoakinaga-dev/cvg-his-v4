<template>
  <div class="finance-catalog-page">
    <AppPageHeader
      title="Cartões"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Cartões']"
      subtitle="Primeira entrega funcional conectada à reconciliação operacional de cartões"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">Novo Cartão</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície funcional conectada ao relatório operacional de cartões e reconciliação financeira. Esta camada já lê
      transações reais do domínio de pagamentos antes da futura expansão completa de cadastro.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${cards.length} cartão(ões)`" value="" icon="💳" />
      <DsStatCard :label="`${receivableCount} com conta a receber`" value="" icon="📥" />
      <DsStatCard :label="`${capturedCount} capturado(s)`" value="" icon="✅" />
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard title="Cartões, bandeiras e contas administrativas">
      <div class="catalog-toolbar">
        <input v-model="query" type="search" placeholder="Buscar por cartão, bandeira ou administradora" class="catalog-search" />
        <div class="catalog-toolbar__actions">
          <DsButton variant="secondary" :loading="loading" @click="reload">Pesquisar</DsButton>
          <DsButton variant="ghost">Baixa em Lote</DsButton>
        </div>
      </div>

      <div v-if="!loading && filteredCards.length === 0" class="catalog-empty">
        Nenhum cartão encontrado.
      </div>

      <div v-else class="catalog-grid">
        <article v-for="card in filteredCards" :key="card.transactionId" class="catalog-item">
          <div class="catalog-item__head">
            <strong>{{ card.cardHolderName || card.ownerName || card.transactionId }}</strong>
            <span class="catalog-item__badge" :class="{ 'catalog-item__badge--active': card.status === 'captured' }">
              {{ statusLabel(card.status) }}
            </span>
          </div>
          <p class="catalog-item__meta">
            Bandeira: {{ card.cardBrand || '—' }} · Administradora: {{ card.provider }} · Final: {{ card.cardLast4 || '—' }}
          </p>
          <p class="catalog-item__hint">{{ card.description }}</p>
          <p class="catalog-item__detail">Paciente: {{ card.patientName || '—' }} · Tutor: {{ card.ownerName || '—' }}</p>
        </article>
      </div>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { financeCardsService, type FinanceCardRow } from '@/services/financeCards';

const query = ref('');
const loading = ref(false);
const error = ref('');
const cards = ref<FinanceCardRow[]>([]);

const filteredCards = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  if (!normalized) return cards.value;
  return cards.value.filter((card) => {
    return [
      card.cardHolderName,
      card.ownerName,
      card.patientName,
      card.cardBrand,
      card.provider,
      card.cardLast4,
      card.description
    ].join(' ').toLowerCase().includes(normalized);
  });
});

const receivableCount = computed(() => cards.value.filter((item) => item.reconciliationState !== 'reconciled').length);
const capturedCount = computed(() => cards.value.filter((item) => item.status === 'captured').length);

function statusLabel(status: string) {
  if (status === 'captured') return 'Capturado';
  if (status === 'authorized_pending_capture') return 'Pendente';
  if (status === 'failed' || status === 'not_authorized') return 'Falhou';
  return status || '—';
}

async function loadCards() {
  loading.value = true;
  error.value = '';
  try {
    cards.value = await financeCardsService.list();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar cartões';
    cards.value = [];
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await loadCards();
}

onMounted(loadCards);
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
.catalog-item__hint,
.catalog-item__detail {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}
.catalog-item__detail { margin-top: 8px; }
.catalog-empty {
  border: 1px dashed var(--color-border, #cbd5e1);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  color: #64748b;
}
</style>
