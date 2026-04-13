<template>
  <div class="laboratory-hub-page">
    <AppPageHeader
      title="Laboratório"
      subtitle="Operação de exames, laudos, equipamentos e parâmetros laboratoriais"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${summary.totalOrders} pedido(s)`" value="" icon="🧪" />
      <DsStatCard :label="`${summary.pendingOrders} aguardando coleta`" value="" icon="📋" />
      <DsStatCard :label="`${summary.pendingResults} aguardando laudo`" value="" icon="📊" />
      <DsStatCard :label="`${summary.equipmentActive} equipamento(s) ativos`" value="" icon="🔬" />
    </section>

    <section class="hub-alerts" v-if="summary.pendingResults > 0 || summary.pendingOrders > 0">
      <DsAlert :variant="summary.pendingResults > 0 ? 'warning' : 'info'" dismissible>
        <strong>Fila laboratorial</strong>
        {{ summary.pendingResults > 0
          ? ` ${summary.pendingResults} laudo(s) ainda aguardam liberação.`
          : ` ${summary.pendingOrders} pedido(s) seguem na fila de coleta.` }}
      </DsAlert>
    </section>

    <section class="hub-actions">
      <DsCard title="Ações rápidas" variant="compact">
        <div class="quick-actions">
          <DsButton variant="secondary" tag="a" to="/laboratory/orders" icon="🧪">
            Pedidos de Exame
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/laboratory/results" icon="📋">
            Resultados
          </DsButton>
          <DsButton variant="primary" tag="a" to="/diagnostics" icon="🔬">
            Central Diagnóstica
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/laboratory/equipment" icon="🔧">
            Equipamentos
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/laboratory/report-types" icon="📄">
            Tipos de Laudo
          </DsButton>
        </div>
      </DsCard>
    </section>

    <section class="hub-section">
      <h2 class="section-title">Exames e Laudos</h2>
      <div class="section-grid">
        <DsCard title="Pedidos de Exame" icon="🧪">
          <p class="card-description">
            Lista operacional consolidada dos pedidos com coleta, status e atalho para a trilha diagnóstica.
          </p>
          <DsButton variant="secondary" tag="a" to="/laboratory/orders" size="sm">
            Gerenciar pedidos
          </DsButton>
        </DsCard>
        <DsCard title="Resultados" icon="📋">
          <p class="card-description">
            Laudos liberados e pendências por tipo de exame, com filtro direto para hemograma, bioquímico e urina.
          </p>
          <DsButton variant="secondary" tag="a" to="/laboratory/results" size="sm">
            Ver resultados
          </DsButton>
        </DsCard>
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
      <h2 class="section-title">Cadastros Laboratoriais</h2>
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
  } catch (err: unknown) {
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hub-actions {
  margin-bottom: 0;
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.card-description {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin: 0 0 12px 0;
}
</style>
