<template>
  <div class="laboratory-hub-page">
    <AppPageHeader
      title="Laboratório"
      :breadcrumbs="['Laboratório', 'Visão geral']"
      subtitle="Da coleta à liberação dos resultados."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <nav class="quick-actions" aria-label="Rotina laboratorial">
      <DsButton variant="primary" tag="a" to="/laboratory/orders" icon="🧪">Pedidos de exame</DsButton>
      <DsButton variant="secondary" tag="a" to="/laboratory/results" icon="📋">Resultados</DsButton>
      <DsButton variant="secondary" tag="a" to="/diagnostics" icon="🔬">Central diagnóstica</DsButton>
    </nav>

    <section class="hub-kpis" aria-label="Resumo laboratorial" :aria-busy="loading">
      <DsStatCard label="Pedidos de exame" :value="!summaryAvailable ? '—' : String(summary.totalOrders)" :loading="loading" icon="🧪" />
      <DsStatCard label="Aguardando coleta" :value="!summaryAvailable ? '—' : String(summary.pendingOrders)" :loading="loading" icon="📋" />
      <DsStatCard label="Aguardando laudo" :value="!summaryAvailable ? '—' : String(summary.pendingResults)" :loading="loading" icon="📊" />
      <DsStatCard label="Equipamentos ativos" :value="!summaryAvailable ? '—' : String(summary.equipmentActive)" :loading="loading" icon="🔬" />
    </section>

    <section class="hub-alerts" v-if="!loading && summaryAvailable && (summary.pendingResults > 0 || summary.pendingOrders > 0)">
      <DsAlert :variant="summary.pendingResults > 0 ? 'warning' : 'info'" dismissible>
        <strong>Fila laboratorial</strong>
        {{ summary.pendingResults > 0
          ? ` ${summary.pendingResults} laudo(s) ainda aguardam liberação.`
          : ` ${summary.pendingOrders} pedido(s) seguem na fila de coleta.` }}
      </DsAlert>
    </section>

    <section class="hub-section">
      <h2 class="section-title">Consultar por exame</h2>
      <div class="section-grid">
        <DsCard title="Hemogramas" icon="🩸">
          <p class="card-description">Resultados de hemograma completo.</p>
          <DsButton variant="secondary" tag="a" to="/laboratory/results?type=HEM" size="sm">
            Ver hemogramas
          </DsButton>
        </DsCard>
        <DsCard title="Bioquímicos" icon="🧪">
          <p class="card-description">Perfil bioquímico sanguíneo.</p>
          <DsButton variant="secondary" tag="a" to="/laboratory/results?type=BIO" size="sm">
            Ver bioquímicos
          </DsButton>
        </DsCard>
        <DsCard title="Urina" icon="💧">
          <p class="card-description">Exames de urina tipo 1.</p>
          <DsButton variant="secondary" tag="a" to="/laboratory/results?type=URIN" size="sm">
            Ver urina
          </DsButton>
        </DsCard>
      </div>
    </section>

    <section class="hub-section">
      <h2 class="section-title">Equipamentos e referências</h2>
      <div class="section-grid">
        <DsCard title="Equipamentos" icon="🔧">
          <p class="card-description">Equipamentos e máquinas do laboratório.</p>
          <DsButton variant="secondary" tag="a" to="/laboratory/equipment" size="sm">
            Gerenciar equipamentos
          </DsButton>
        </DsCard>
        <DsCard title="Tipos de Laudo" icon="📄">
          <p class="card-description">Modelos e tipos de laudo laboratorial.</p>
          <DsButton variant="secondary" tag="a" to="/laboratory/report-types" size="sm">
            Gerenciar tipos
          </DsButton>
        </DsCard>
        <DsCard title="Valores de Referência" icon="📈">
          <p class="card-description">Tabela de valores de referência por exame.</p>
          <DsButton variant="secondary" tag="a" to="/laboratory/reference-values" size="sm">
            Gerenciar valores
          </DsButton>
        </DsCard>
        <DsCard title="Referências de hemograma">
          <p class="card-description">Faixas hematológicas por espécie e parâmetro.</p>
          <DsButton variant="secondary" tag="a" to="/laboratory/hemogram-reference-values" size="sm">
            Referências de hemograma
          </DsButton>
        </DsCard>
        <DsCard title="Referências de bioquímico">
          <p class="card-description">Faixas bioquímicas por espécie e parâmetro.</p>
          <DsButton variant="secondary" tag="a" to="/laboratory/biochemistry-reference-values" size="sm">
            Referências de bioquímico
          </DsButton>
        </DsCard>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import { laboratoryService, type LaboratoryDashboardSummary } from '@/services/laboratory';

const loading = ref(false);
const error = ref('');
const summaryAvailable = ref(false);
const summary = ref<LaboratoryDashboardSummary>({
  totalOrders: 0,
  pendingOrders: 0,
  pendingResults: 0,
  releasedResults: 0,
  equipmentActive: 0
});
async function load() {
  loading.value = true;
  error.value = '';
  try {
    summary.value = await laboratoryService.getDashboardSummary();
    summaryAvailable.value = true;
  } catch (err: unknown) {
    summaryAvailable.value = false;
    error.value = err instanceof Error ? err.message : 'Erro ao carregar resumo laboratorial';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-hub-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hub-section {
  margin-top: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 12px;
}

.card-description {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin: 0 0 12px 0;
}

.hub-kpis :deep(.ds-stat-card) {
  min-width: 0;
  gap: 12px;
  padding: 16px;
}

.section-grid :deep(.ds-card) {
  display: flex;
  flex-direction: column;
}

.section-grid :deep(.ds-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
}

.section-grid :deep(.ds-btn) {
  margin-top: auto;
  white-space: normal;
  min-height: 44px;
}

@media (max-width: 1180px) {
  .hub-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 540px) {
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-actions :deep(.ds-btn) {
    width: 100%;
    min-height: 44px;
    white-space: normal;
  }

  .quick-actions :deep(.ds-btn:first-child) {
    grid-column: 1 / -1;
  }

  .hub-kpis {
    gap: 8px;
  }

  .hub-kpis :deep(.ds-stat-card) {
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
  }

  .hub-kpis :deep(.ds-stat-card__icon) {
    width: 28px;
    height: 28px;
    border-radius: 8px;
  }

  .hub-kpis :deep(.ds-stat-card__icon svg) {
    width: 20px;
    height: 20px;
  }

  .hub-kpis :deep(.ds-stat-card__value) {
    font-size: 24px;
  }

  .hub-kpis :deep(.ds-stat-card__label) {
    font-size: 12px;
    line-height: 1.4;
  }
}
</style>
