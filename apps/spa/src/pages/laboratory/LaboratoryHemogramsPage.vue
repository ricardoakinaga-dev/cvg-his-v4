<template>
  <LaboratoryAnalyticalResultPage
    title="Hemogramas"
    subtitle="Registro completo de hemograma com valores de referência automáticos, desvios e histórico."
    reference-label="Vlr. Ref. Hemograma"
    mode="table"
    :parameters="parameters"
    :sections="sections"
    :insights="insights"
  />
</template>

<script setup lang="ts">
import LaboratoryAnalyticalResultPage from './LaboratoryAnalyticalResultPage.vue';
import type {
  AnalyticalInsight,
  AnalyticalParameter,
  AnalyticalSection
} from './LaboratoryAnalyticalResultPage.vue';

const parameters: AnalyticalParameter[] = [
  { name: 'Hemácias', value: '4.9', unit: 'milhões/mm³', reference: '5.5 - 8.5', outOfRange: true },
  { name: 'Hemoglobina', value: '13.2', unit: 'g/dL', reference: '12.0 - 18.0' },
  { name: 'Leucócitos', value: '18.400', unit: '/mm³', reference: '6.000 - 17.000', outOfRange: true },
  { name: 'Plaquetas', value: '310.000', unit: '/mm³', reference: '200.000 - 500.000' }
];

const sections: AnalyticalSection[] = [
  { title: 'Série vermelha', items: ['Hemácias', 'Hemoglobina', 'Hematócrito'] },
  { title: 'Série branca', items: ['Leucócitos', 'Neutrófilos', 'Linfócitos'] },
  { title: 'Plaquetas', items: ['Contagem plaquetária', 'Observações morfológicas'] }
];

const insights: AnalyticalInsight[] = [
  {
    title: 'Série vermelha',
    description: 'Eixo hematológico tabular para anemia, hidratação e acompanhamento evolutivo.'
  },
  {
    title: 'Série branca',
    description: 'Leitura comparativa de resposta inflamatória e infecciosa dentro da esteira analítica.'
  },
  {
    title: 'Plaquetas',
    description: 'Camada de hemostasia e observações morfológicas antes da emissão do laudo.'
  },
  {
    title: 'Histórico comparativo',
    description: 'Resultado atual deve ser comparável com exames anteriores do mesmo animal.'
  }
];
</script>
