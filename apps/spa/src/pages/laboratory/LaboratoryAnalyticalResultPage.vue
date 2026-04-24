<template>
  <div class="analytical-page">
    <AppPageHeader
      :title="title"
      :breadcrumbs="['Laboratório', title]"
      :subtitle="subtitle"
    >
      <template #actions>
        <DsButton tag="a" to="/laboratory/orders" variant="secondary">Exames</DsButton>
        <DsButton tag="a" to="/queue/exams" variant="secondary">Esteira de Exames</DsButton>
        <DsButton tag="a" to="/laboratory/results" variant="primary">Laudo</DsButton>
      </template>
    </AppPageHeader>

    <section class="kpi-grid">
      <DsStatCard :value="parameters.length.toString()" label="parâmetro(s)" icon="📊" />
      <DsStatCard :value="outOfRangeCount.toString()" label="Fora da faixa" icon="⚠️" />
      <DsStatCard :value="sections.length.toString()" label="seção(ões)" icon="🧬" />
      <DsStatCard :value="referenceLabel" label="referência aplicada" icon="📈" />
    </section>

    <section class="flow-grid">
      <article v-for="step in flow" :key="step" class="flow-card">
        <span>{{ step }}</span>
      </article>
    </section>

    <section class="section-grid">
      <DsCard title="Leitura do módulo">
        <div class="insight-grid">
          <article v-for="insight in insights" :key="insight.title" class="insight-card">
            <strong>{{ insight.title }}</strong>
            <p>{{ insight.description }}</p>
          </article>
        </div>
      </DsCard>

      <DsCard title="Resultado estruturado">
        <div v-if="mode === 'table'" class="result-table">
          <div class="result-table__row result-table__row--header">
            <span>Parâmetro</span>
            <span>Valor</span>
            <span>Unidade</span>
            <span>Referência</span>
            <span>Status</span>
          </div>
          <div
            v-for="parameter in parameters"
            :key="parameter.name"
            class="result-table__row"
          >
            <span>{{ parameter.name }}</span>
            <span>{{ parameter.value }}</span>
            <span>{{ parameter.unit }}</span>
            <span>{{ parameter.reference }}</span>
            <StatusBadge
              :label="parameter.outOfRange ? 'Fora da faixa' : 'Dentro da faixa'"
              :variant="parameter.outOfRange ? 'warning' : 'success'"
              size="sm"
            />
          </div>
        </div>

        <div v-else class="section-result-grid">
          <article v-for="section in sections" :key="section.title" class="section-result-card">
            <strong>{{ section.title }}</strong>
            <ul>
              <li v-for="item in section.items" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>
      </DsCard>

      <DsCard title="Integrações transversais">
        <div class="integration-grid">
          <article v-for="item in integrations" :key="item.title" class="integration-card">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

export interface AnalyticalParameter {
  name: string;
  value: string;
  unit: string;
  reference: string;
  outOfRange?: boolean;
}

export interface AnalyticalSection {
  title: string;
  items: string[];
}

export interface AnalyticalInsight {
  title: string;
  description: string;
}

interface Props {
  title: string;
  subtitle: string;
  referenceLabel: string;
  mode: 'table' | 'sections';
  parameters?: AnalyticalParameter[];
  sections?: AnalyticalSection[];
  insights: AnalyticalInsight[];
}

const props = withDefaults(defineProps<Props>(), {
  parameters: () => [],
  sections: () => []
});

const outOfRangeCount = computed(() =>
  props.parameters.filter((parameter) => parameter.outOfRange).length
);
const flow = ['Exames', 'Esteira de Exames', 'Coleta', props.title, 'Laudo', 'Entrega'];
const integrations = [
  {
    title: 'Animal',
    description: 'Paciente é a âncora clínica do resultado e do histórico comparativo.'
  },
  {
    title: 'Atendimento e internação',
    description: 'A requisição nasce da jornada assistencial e sustenta decisão clínica contínua.'
  },
  {
    title: 'Financeiro e comanda',
    description: 'Valor do exame ou laudo pode repercutir em comanda, título ou origem financeira.'
  }
];
</script>

<style scoped>
.analytical-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.kpi-grid,
.flow-grid,
.section-grid,
.insight-grid,
.integration-grid,
.section-result-grid {
  display: grid;
  gap: 12px;
}

.kpi-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.flow-grid {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.section-grid {
  grid-template-columns: 1fr;
}

.insight-grid,
.integration-grid,
.section-result-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.flow-card,
.insight-card,
.integration-card,
.section-result-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.flow-card span {
  font-weight: 800;
}

.insight-card p,
.integration-card p {
  margin: 6px 0 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.result-table {
  display: grid;
  gap: 6px;
}

.result-table__row {
  display: grid;
  grid-template-columns: 1fr 0.6fr 0.5fr 0.8fr 0.7fr;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border-radius: 12px;
  background: var(--color-bg-subtle, #f8fafc);
}

.result-table__row--header {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
}

.section-result-card ul {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--color-text-secondary, #475569);
}

@media (max-width: 760px) {
  .result-table__row {
    grid-template-columns: 1fr;
  }
}
</style>
