import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import LaboratoryBiochemistryPage from '../LaboratoryBiochemistryPage.vue';
import LaboratoryHemogramsPage from '../LaboratoryHemogramsPage.vue';
import LaboratoryUrinalysisPage from '../LaboratoryUrinalysisPage.vue';

describe('Laboratory analytical result pages', () => {
  it('renders hemograms as a tabular result with references, flags and history', () => {
    const wrapper = mount(LaboratoryHemogramsPage);

    expect(wrapper.text()).toContain('Hemogramas');
    expect(wrapper.text()).toContain('Registro completo de hemograma');
    expect(wrapper.text()).toContain('Série vermelha');
    expect(wrapper.text()).toContain('Série branca');
    expect(wrapper.text()).toContain('Plaquetas');
    expect(wrapper.text()).toContain('Vlr. Ref. Hemograma');
    expect(wrapper.text()).toContain('Fora da faixa');
    expect(wrapper.text()).toContain('Histórico comparativo');
    expect(wrapper.text()).toContain('Esteira de Exames');
    expect(wrapper.text()).toContain('Laudo');
  });

  it('renders urinalysis as physical chemical and microscopic sections', () => {
    const wrapper = mount(LaboratoryUrinalysisPage);

    expect(wrapper.text()).toContain('Urina');
    expect(wrapper.text()).toContain('Análise urinária completa');
    expect(wrapper.text()).toContain('Exame físico');
    expect(wrapper.text()).toContain('Exame químico');
    expect(wrapper.text()).toContain('Exame microscópico');
    expect(wrapper.text()).toContain('Achados observacionais');
    expect(wrapper.text()).toContain('Resultado clínico estruturado');
    expect(wrapper.text()).toContain('Laudo');
  });

  it('renders biochemistry as a compact tabular panel with species references', () => {
    const wrapper = mount(LaboratoryBiochemistryPage);

    expect(wrapper.text()).toContain('Bioquímico');
    expect(wrapper.text()).toContain('Painel bioquímico completo');
    expect(wrapper.text()).toContain('Resultado tabular');
    expect(wrapper.text()).toContain('12-15 campos');
    expect(wrapper.text()).toContain('Valores de referência por espécie');
    expect(wrapper.text()).toContain('Vlr. Ref. Bioquímico');
    expect(wrapper.text()).toContain('Fora da faixa');
    expect(wrapper.text()).toContain('Laudo');
  });
});
