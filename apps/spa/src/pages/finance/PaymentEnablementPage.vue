<template>
  <div class="payment-enablement-page">
    <AppPageHeader
      title="Habilitar Pagamento"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Habilitar Pagamento']"
      subtitle="Credenciamento de provedores de pagamento."
    />

    <section class="enablement-unavailable" aria-labelledby="enablement-status-title">
      <span class="enablement-icon" aria-hidden="true"><DsIcon name="credit-card" size="lg" /></span>
      <h2 id="enablement-status-title">Status de credenciamento indisponível</h2>
      <p>Ainda não é possível consultar ou alterar a habilitação dos provedores nesta tela.</p>
    </section>

    <nav class="related-routines" aria-label="Rotinas relacionadas a pagamentos">
      <DsButton variant="secondary" tag="a" to="/finance/card-machines">Maquininhas</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/split">Configuração do Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/payments-dashboard">Pagamento Dashboard</DsButton>
    </nav>
  </div>
</template>

<script setup lang="ts">
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';
</script>

<style scoped>
.payment-enablement-page { display: grid; gap: 20px; }
.enablement-unavailable {
  padding: clamp(24px, 4vw, 48px);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
}
.enablement-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 20px;
  color: var(--color-primary);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}
.enablement-unavailable h2 { margin: 0 0 12px; font-size: clamp(20px, 2vw, 26px); line-height: 1.3; }
.enablement-unavailable p { margin: 0; max-width: 62ch; color: var(--color-text-secondary); line-height: 1.6; }
.related-routines { display: flex; flex-wrap: wrap; gap: 12px; }
.related-routines :deep(.ds-btn__label) { white-space: normal; overflow: visible; text-overflow: clip; }
@media (max-width: 620px) { .related-routines { display: grid; grid-template-columns: 1fr; } }
</style>
