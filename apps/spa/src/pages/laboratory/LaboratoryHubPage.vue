<template>
  <div class="laboratory-hub-page">
    <AppPageHeader
      title="Laboratório"
      :breadcrumbs="['Laboratório', 'Visão geral']"
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
      <h2 class="section-title">Arquitetura operacional do Laboratório</h2>
      <div class="lab-flow-grid" aria-label="Fluxo diagnóstico laboratorial">
        <article v-for="step in operationalFlow" :key="step.title" class="lab-flow-card">
          <span>{{ step.eyebrow }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
        </article>
      </div>
    </section>

    <section class="hub-section">
      <h2 class="section-title">Camadas do domínio</h2>
      <div class="section-grid">
        <DsCard v-for="layer in domainLayers" :key="layer.title" :title="layer.title" :icon="layer.icon">
          <p class="card-description">{{ layer.description }}</p>
          <DsButton v-if="layer.to" variant="secondary" tag="a" :to="layer.to" size="sm">
            {{ layer.action }}
          </DsButton>
        </DsCard>
      </div>
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
const operationalFlow = [
  {
    eyebrow: 'Entrada',
    title: 'Requisição de exame',
    description: 'A ordem nasce vinculada ao cliente, animal, data e necessidade assistencial.'
  },
  {
    eyebrow: 'Fluxo',
    title: 'Esteira de Exames',
    description: 'Orquestra estados como Solicitado, Coletado, Em Análise, Laudado e Entregue.'
  },
  {
    eyebrow: 'Operação',
    title: 'Coleta',
    description: 'Transforma a solicitação em amostra rastreável para execução técnica.'
  },
  {
    eyebrow: 'Análise',
    title: 'Resultado especializado',
    description: 'Hemogramas, Urina e Bioquímico seguem modelos analíticos próprios.'
  },
  {
    eyebrow: 'Documento',
    title: 'Laudo',
    description: 'Formaliza conclusão clínica com corpo, anexos, datas e valor.'
  },
  {
    eyebrow: 'Saída',
    title: 'Entrega',
    description: 'Fecha o ciclo diagnóstico e devolve evidência ao atendimento.'
  }
];
const domainLayers = [
  {
    icon: '🧪',
    title: 'Exames',
    description: 'Camada de ordem/fila operacional por cliente, animal e data.',
    action: 'Abrir exames',
    to: '/laboratory/orders'
  },
  {
    icon: '📋',
    title: 'Laudos',
    description: 'Documento clínico final com data de entrada, finalização, valor e documentação fotográfica.',
    action: 'Abrir laudos',
    to: '/laboratory/results'
  },
  {
    icon: '📄',
    title: 'Tipos de Laudo',
    description: 'Template com título e corpo para padronizar emissão diagnóstica.',
    action: 'Abrir templates',
    to: '/laboratory/report-types'
  },
  {
    icon: '🩸',
    title: 'Vlr. Ref. Hemograma',
    description: 'Norma hematológica por espécie, parâmetro, unidade e faixa esperada.',
    action: 'Abrir referências',
    to: '/laboratory/hemogram-reference-values'
  },
  {
    icon: '⚗️',
    title: 'Vlr. Ref. Bioquímico',
    description: 'Norma bioquímica que transforma resultado numérico em interpretação clínica.',
    action: 'Abrir referências',
    to: '/laboratory/reference-values'
  },
  {
    icon: '🔧',
    title: 'Equipamentos',
    description: 'Infraestrutura técnica, manutenção e calibração que sustentam confiabilidade da medição.',
    action: 'Abrir equipamentos',
    to: '/laboratory/equipment'
  }
];

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

.lab-flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.lab-flow-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.lab-flow-card span {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.lab-flow-card p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.card-description {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin: 0 0 12px 0;
}
</style>
