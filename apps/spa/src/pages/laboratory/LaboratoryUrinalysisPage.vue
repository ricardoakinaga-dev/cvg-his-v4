<template>
  <LaboratoryAnalyticalResultPage
    title="Urina"
    subtitle="Análise urinária completa como resultado clínico estruturado por seções."
    reference-label="Achados observacionais"
    mode="sections"
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
  { name: 'Densidade', value: '1.035', unit: '', reference: '1.015 - 1.045' },
  { name: 'pH', value: '8.0', unit: '', reference: '5.5 - 7.5', outOfRange: true }
];

const sections: AnalyticalSection[] = [
  { title: 'Exame físico', items: ['Volume', 'Cor', 'Aspecto', 'Densidade'] },
  { title: 'Exame químico', items: ['pH', 'Proteína', 'Glicose', 'Corpos cetônicos'] },
  { title: 'Exame microscópico', items: ['Células', 'Cristais', 'Cilindros', 'Bactérias'] }
];

const insights: AnalyticalInsight[] = [
  {
    title: 'Resultado clínico estruturado',
    description: 'Urina combina dados qualitativos, semi-quantitativos e observações clínicas.'
  },
  {
    title: 'Exame físico',
    description: 'Macroscopia organiza volume, cor, aspecto e concentração da amostra.'
  },
  {
    title: 'Exame químico',
    description: 'Parâmetros de fita ou leitura química sustentam triagem metabólica e renal.'
  },
  {
    title: 'Exame microscópico',
    description: 'Achados celulares e cristalúria alimentam a interpretação do laudo.'
  }
];
</script>
