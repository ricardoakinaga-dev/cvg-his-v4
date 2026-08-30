import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryBiochemistryPage from '../LaboratoryBiochemistryPage.vue';
import LaboratoryHemogramsPage from '../LaboratoryHemogramsPage.vue';
import LaboratoryUrinalysisPage from '../LaboratoryUrinalysisPage.vue';
import { laboratoryService } from '@/services/laboratory';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listHemograms: vi.fn(),
    listUrinalysis: vi.fn(),
    listBiochemistry: vi.fn(),
    listReferenceValues: vi.fn()
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    list: vi.fn()
  }
}));

describe('Laboratory analytical result pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laboratoryService.listHemograms).mockResolvedValue([
      {
        id: 'diag_hem_1' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'patient_1' as never,
        examType: 'Hemograma',
        examCatalogId: 'cat_001',
        reason: 'Check-up',
        status: 'resulted',
        resultSummary: 'Hemacias: 6.2; Leucocitos: 12.4',
        resultValues: [
          { parameter: 'Hemacias', value: '6.2', unit: 'milhoes/uL', outOfRange: false },
          { parameter: 'Leucocitos', value: '12.4', unit: 'mil/uL', outOfRange: false }
        ],
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-25T10:00:00.000Z'
      }
    ]);
    vi.mocked(laboratoryService.listUrinalysis).mockResolvedValue([
      {
        id: 'diag_uri_1' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'patient_1' as never,
        examType: 'Urina',
        examCatalogId: 'cat_003',
        reason: 'Suspeita urinaria',
        status: 'resulted',
        resultSummary: 'Densidade urinaria: 1.035; pH urinario: 6.5',
        resultValues: [
          { parameter: 'Densidade urinaria', value: '1.035', unit: 'SG', outOfRange: false },
          { parameter: 'pH urinario', value: '6.5', unit: 'pH', outOfRange: false }
        ],
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-25T10:00:00.000Z'
      }
    ]);
    vi.mocked(laboratoryService.listBiochemistry).mockResolvedValue([
      {
        id: 'diag_bio_1' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'patient_1' as never,
        examType: 'Bioquimico',
        examCatalogId: 'cat_002',
        reason: 'Perfil bioquimico',
        status: 'resulted',
        resultSummary: 'ALT: 92; Creatinina: 1.3',
        resultValues: [
          { parameter: 'ALT', value: '92', unit: 'U/L', reference: '10-125 U/L', outOfRange: false },
          { parameter: 'Creatinina', value: '1.3', unit: 'mg/dL', reference: '0.5-1.8 mg/dL', outOfRange: false }
        ],
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-25T10:00:00.000Z'
      }
    ]);
    vi.mocked(laboratoryService.listReferenceValues).mockImplementation(async (filterExam?: string | { examType?: string }) => {
      const examType = typeof filterExam === 'string' ? filterExam : filterExam?.examType;
      if (examType === 'URIN') {
        return [
          {
            id: 'ref-urin-1',
            parameter: 'Densidade urinaria',
            examType: 'URIN',
            minValue: 1.015,
            maxValue: 1.045,
            unit: 'SG'
          },
          {
            id: 'ref-urin-2',
            parameter: 'pH urinario',
            examType: 'URIN',
            minValue: 5.5,
            maxValue: 7.5,
            unit: 'pH'
          }
        ];
      }

      if (examType === 'BIO') {
        return [
          {
            id: 'ref-bio-1',
            parameter: 'ALT',
            examType: 'BIO',
            minValue: 10,
            maxValue: 125,
            unit: 'U/L'
          },
          {
            id: 'ref-bio-2',
            parameter: 'Creatinina',
            examType: 'BIO',
            minValue: 0.5,
            maxValue: 1.8,
            unit: 'mg/dL'
          },
          {
            id: 'ref-bio-3',
            parameter: 'Glicose',
            examType: 'BIO',
            minValue: 70,
            maxValue: 120,
            unit: 'mg/dL'
          }
        ];
      }

      return [
      {
        id: 'ref-hem-1',
        parameter: 'Hemacias',
        examType: 'HEM',
        minValue: 5.5,
        maxValue: 8.5,
        unit: 'milhoes/uL'
      },
      {
        id: 'ref-hem-2',
        parameter: 'Leucocitos',
        examType: 'HEM',
        minValue: 6,
        maxValue: 17,
        unit: 'mil/uL'
      }
      ];
    });
    vi.mocked(patientService.list).mockResolvedValue([
      {
        id: 'patient_1',
        accountId: 'acc_1',
        name: 'Mel',
        species: 'Canina',
        sex: 'female',
        primaryOwnerId: 'owner_1',
        status: 'active',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z'
      }
    ]);
    vi.mocked(ownerService.list).mockResolvedValue([
      {
        id: 'owner_1',
        accountId: 'acc_1',
        fullName: 'Cliente Exemplo',
        contacts: [],
        financialResponsible: true,
        status: 'active',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z'
      }
    ]);
  });

  it('renders hemograms as an operational result flow with references, filters and history', async () => {
    const wrapper = mount(LaboratoryHemogramsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Hemogramas');
    expect(wrapper.text()).toContain('Registro completo de hemograma');
    expect(wrapper.text()).toContain('Código do Hemograma');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Proprietário');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Data da Análise');
    expect(wrapper.text()).toContain('Data de Entrada');
    expect(wrapper.text()).toContain('Pesquisar Hemogramas Fechados');
    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).toContain('Série vermelha');
    expect(wrapper.text()).toContain('Série branca');
    expect(wrapper.text()).toContain('Hemácias');
    expect(wrapper.text()).toContain('Leucócitos');
    expect(wrapper.text()).toContain('Histórico comparativo');
    expect(wrapper.text()).toContain('6.2');
    expect(laboratoryService.listHemograms).toHaveBeenCalledWith({
      code: undefined,
      finalizedAt: undefined,
      enteredAt: undefined,
      body: undefined,
      closed: true
    });
    expect(laboratoryService.listReferenceValues).toHaveBeenCalledWith('HEM');
  });

  it('sends Vetus-like hemogram filters to the laboratory API', async () => {
    const wrapper = mount(LaboratoryHemogramsPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('diag');
    await searchInputs[4].setValue('Hemacias');
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0].setValue('2026-04-25');
    await dateInputs[1].setValue('2026-04-24');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(laboratoryService.listHemograms).toHaveBeenLastCalledWith({
      code: 'diag',
      finalizedAt: '2026-04-25',
      enteredAt: '2026-04-24',
      body: 'Hemacias',
      closed: true
    });
  });

  it('renders urinalysis as an operational physical chemical and microscopic flow', async () => {
    const wrapper = mount(LaboratoryUrinalysisPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Urina');
    expect(wrapper.text()).toContain('Análise urinária completa');
    expect(wrapper.text()).toContain('Código do Exame');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Proprietário');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Data da Análise');
    expect(wrapper.text()).toContain('Data de Entrada');
    expect(wrapper.text()).toContain('Pesquisar Exames Fechados');
    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).toContain('Exame físico');
    expect(wrapper.text()).toContain('Exame químico');
    expect(wrapper.text()).toContain('Exame microscópico');
    expect(wrapper.text()).toContain('Achados observacionais');
    expect(wrapper.text()).toContain('Densidade urinária');
    expect(wrapper.text()).toContain('pH urinário');
    expect(wrapper.text()).toContain('1.035');
    expect(laboratoryService.listUrinalysis).toHaveBeenCalledWith({
      code: undefined,
      finalizedAt: undefined,
      enteredAt: undefined,
      body: undefined,
      closed: true
    });
    expect(laboratoryService.listReferenceValues).toHaveBeenCalledWith('URIN');
  });

  it('sends Vetus-like urinalysis filters to the laboratory API', async () => {
    const wrapper = mount(LaboratoryUrinalysisPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('diag');
    await searchInputs[4].setValue('Densidade');
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0].setValue('2026-04-25');
    await dateInputs[1].setValue('2026-04-24');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(laboratoryService.listUrinalysis).toHaveBeenLastCalledWith({
      code: 'diag',
      finalizedAt: '2026-04-25',
      enteredAt: '2026-04-24',
      body: 'Densidade',
      closed: true
    });
  });

  it('renders biochemistry as an operational compact tabular panel with species references', async () => {
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Bioquímico');
    expect(wrapper.text()).toContain('Painel bioquímico completo');
    expect(wrapper.text()).toContain('Código do Exame');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Proprietário');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Data da Análise');
    expect(wrapper.text()).toContain('Data de Entrada');
    expect(wrapper.text()).toContain('Pesquisar Bioquímicos Fechados');
    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).toContain('Resultado estruturado');
    expect(wrapper.text()).toContain('Painel hepático');
    expect(wrapper.text()).toContain('Painel renal');
    expect(wrapper.text()).toContain('Metabólico');
    expect(wrapper.text()).toContain('ALT');
    expect(wrapper.text()).toContain('92');
    expect(wrapper.text()).toContain('Creatinina');
    expect(wrapper.text()).toContain('Vlr. Ref. Bioquímico');
    expect(laboratoryService.listBiochemistry).toHaveBeenCalledWith({
      code: undefined,
      finalizedAt: undefined,
      enteredAt: undefined,
      body: undefined,
      closed: true
    });
    expect(laboratoryService.listReferenceValues).toHaveBeenCalledWith('BIO');
  });

  it('sends Vetus-like biochemistry filters to the laboratory API', async () => {
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('diag');
    await searchInputs[4].setValue('ALT');
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0].setValue('2026-04-25');
    await dateInputs[1].setValue('2026-04-24');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(laboratoryService.listBiochemistry).toHaveBeenLastCalledWith({
      code: 'diag',
      finalizedAt: '2026-04-25',
      enteredAt: '2026-04-24',
      body: 'ALT',
      closed: true
    });
  });

  it('filters a structured-only biochemistry result by parameter body', async () => {
    vi.mocked(laboratoryService.listBiochemistry).mockResolvedValue([
      {
        id: 'diag_bio_structured' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'patient_1' as never,
        examType: 'Bioquimico',
        examCatalogId: 'cat_002',
        reason: 'Resultado sem resumo textual',
        status: 'resulted',
        resultValues: [
          { parameter: 'ALT', value: '92', unit: 'U/L', outOfRange: false }
        ],
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-25T10:00:00.000Z'
      }
    ]);

    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    expect(wrapper.text()).toContain('92');

    await wrapper.findAll('input[type="search"]')[4].setValue('ALT');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('92');
    expect(laboratoryService.listBiochemistry).toHaveBeenLastCalledWith({
      code: undefined,
      finalizedAt: undefined,
      enteredAt: undefined,
      body: 'ALT',
      closed: true
    });
  });
});
