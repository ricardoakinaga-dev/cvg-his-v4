<template>
  <article
    class="counter-sale-card"
    :class="{ 'counter-sale-card--selected': props.sale.selected }"
  >
    <div class="counter-sale-card__header">
      <DsBadge :variant="props.sale.statusVariant">
        {{ props.sale.statusLabel }}
      </DsBadge>
      <div class="counter-sale-card__field">
        <span>ID da Comanda:</span>
        <strong>{{ props.sale.number }}</strong>
      </div>
      <div class="counter-sale-card__field">
        <span>Abertura:</span>
        <strong>{{ props.sale.openedAtLabel }}</strong>
      </div>
      <div class="counter-sale-card__field">
        <span>Fechamento:</span>
        <strong>{{ props.sale.closedAtLabel }}</strong>
      </div>
      <div class="counter-sale-card__field">
        <span>Cliente:</span>
        <strong>{{ props.sale.ownerNameLabel }}</strong>
      </div>
      <div class="counter-sale-card__field counter-sale-card__field--total">
        <span>Valor Total:</span>
        <strong>{{ props.sale.totalLabel }}</strong>
      </div>
      <DsButton size="sm" variant="primary" @click="selectSale">
        Ver comanda
      </DsButton>
    </div>

    <div class="counter-sale-card__mobile-context">
      <span>{{ props.sale.primaryContactLabel }}</span>
      <span>{{ props.sale.patientsLabel }}</span>
      <span>{{ props.sale.openedByLabel }}</span>
      <span>{{ props.sale.accountLabel }}</span>
    </div>

    <div class="counter-sale-card__grid">
      <div class="summary-card">
        <span class="summary-card__label">Total</span>
        <strong class="summary-card__value">{{ props.sale.totalLabel }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-card__label">Pago</span>
        <strong class="summary-card__value">{{ props.sale.paidLabel }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-card__label">Saldo</span>
        <strong class="summary-card__value">{{ props.sale.balanceLabel }}</strong>
      </div>
    </div>

    <p v-if="props.sale.notes" class="counter-sale-card__notes">{{ props.sale.notes }}</p>

    <details class="counter-sale-card__details">
      <summary>Informações do cliente</summary>
      <div class="counter-sale-card__details-grid">
        <span>{{ props.sale.ownerNameLabel }}</span>
        <span>{{ props.sale.primaryContactLabel }}</span>
        <span>{{ props.sale.patientsLabel }}</span>
      </div>
    </details>

    <details class="counter-sale-card__details">
      <summary>Serviços / Produtos</summary>
      <div class="counter-sale-card__details-grid">
        <span>{{ props.sale.itemsCountLabel }}</span>
        <span>Produtos: {{ props.sale.productsTotalLabel }}</span>
        <span>Serviços: {{ props.sale.servicesTotalLabel }}</span>
      </div>
    </details>

    <div class="counter-sale-card__actions">
      <DsButton size="sm" variant="primary" @click="selectSale">
        {{ props.sale.selectLabel }}
      </DsButton>
      <DsButton
        v-if="props.sale.ownerHref"
        size="sm"
        variant="ghost"
        tag="a"
        :to="props.sale.ownerHref"
      >
        Ver tutor
      </DsButton>
    </div>
  </article>
</template>

<script setup lang="ts">
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

export interface CounterSalesCardModel {
  readonly id: string;
  readonly statusVariant: 'warning' | 'success' | 'danger';
  readonly statusLabel: string;
  readonly number: string;
  readonly openedAtLabel: string;
  readonly closedAtLabel: string;
  readonly ownerNameLabel: string;
  readonly totalLabel: string;
  readonly primaryContactLabel: string;
  readonly patientsLabel: string;
  readonly openedByLabel: string;
  readonly accountLabel: string;
  readonly paidLabel: string;
  readonly balanceLabel: string;
  readonly notes: string | null;
  readonly itemsCountLabel: string;
  readonly productsTotalLabel: string;
  readonly servicesTotalLabel: string;
  readonly selected: boolean;
  readonly selectLabel: string;
  readonly ownerHref: string | null;
}

const props = defineProps<{
  sale: CounterSalesCardModel;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

function selectSale(): void {
  emit('select', props.sale.id);
}
</script>

<style scoped>
.counter-sale-card {
  border: 1px solid var(--color-border, #d7dee8);
  border-radius: 18px;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 248, 252, 0.95)),
    radial-gradient(circle at top right, rgba(241, 144, 42, 0.08), transparent 42%);
}

.counter-sale-card--selected {
  border-color: rgba(241, 144, 42, 0.65);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
}

.counter-sale-card__header {
  display: grid;
  grid-template-columns:
    110px minmax(120px, 0.85fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(180px, 1.35fr)
    minmax(130px, 0.8fr) max-content;
  align-items: center;
}

.counter-sale-card__field {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.counter-sale-card__field span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.counter-sale-card__field strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
  color: var(--color-text, #0f172a);
}

.counter-sale-card__field--total strong {
  font-weight: 800;
}

.counter-sale-card__mobile-context {
  display: none;
}

.counter-sale-card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.summary-card__label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  font-size: 18px;
}

.counter-sale-card__notes {
  margin: 0;
  color: var(--color-text-muted, #64748b);
}

.counter-sale-card__details {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.72);
}

.counter-sale-card__details summary {
  padding: 10px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.counter-sale-card__details-grid {
  display: grid;
  gap: 6px;
  padding: 0 12px 12px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.counter-sale-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 1100px) {
  .counter-sale-card__header {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .counter-sale-card__mobile-context {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    color: var(--color-text-muted, #64748b);
    font-size: 13px;
  }
}
</style>
