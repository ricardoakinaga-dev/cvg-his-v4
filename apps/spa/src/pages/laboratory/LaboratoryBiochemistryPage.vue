<template>
  <LaboratoryAnalyticalResultPage
    title="Bioquímico"
    subtitle="Painel bioquímico completo com resultado tabular compacto e valores de referência por espécie."
    reference-label="Vlr. Ref. Bioquímico"
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
  { name: 'ALT', value: '92', unit: 'U/L', reference: '10 - 88', outOfRange: true },
  { name: 'Creatinina', value: '1.3', unit: 'mg/dL', reference: '0.5 - 1.5' },
  { name: 'Ureia', value: '64', unit: 'mg/dL', reference: '20 - 60', outOfRange: true },
  { name: 'Fosfatase Alcalina', value: '80', unit: 'U/L', reference: '20 - 150' }
];

const sections: AnalyticalSection[] = [
  { title: 'Painel hepático', items: ['ALT', 'AST', 'Fosfatase Alcalina', 'GGT'] },
  { title: 'Painel renal', items: ['Ureia', 'Creatinina', 'Fósforo'] },
  { title: 'Metabólico', items: ['Glicose', 'Proteínas totais', 'Albumina'] }
];

const insights: AnalyticalInsight[] = [
  {
    title: 'Painel bioquímico completo',
    description: 'Conjunto objetivo de parâmetros para função hepática, renal e metabólica.'
  },
  {
    title: 'Resultado tabular',
    description: 'Estrutura quantitativa compacta, diferente da leitura multisseção da urina.'
  },
  {
    title: '12-15 campos',
    description: 'Modelo esperado para painel compacto com parâmetros-chave por espécie.'
  },
  {
    title: 'Valores de referência por espécie',
    description: 'A faixa esperada contextualiza desvios e alimenta o laudo final.'
  }
];
</script>
