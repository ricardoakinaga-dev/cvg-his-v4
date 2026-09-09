import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
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
    list: vi.fn(),
    getById: vi.fn()
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    list: vi.fn(),
    getById: vi.fn()
  }
}));


const selectResult = async (wrapper: VueWrapper, index = 0) => {
  const buttons = wrapper.findAll('button').filter((button) => button.text() === 'Ver resultado');
  expect(buttons.length).toBeGreaterThan(index);
  await buttons[index].trigger('click');
  await flushPromises();
};

const filterInput = (wrapper: VueWrapper, label: string) => {
  const field = wrapper.findAll('form label').find((candidate) => candidate.text().includes(label));
  expect(field, `Filter ${label} exists`).toBeDefined();
  const id = field!.attributes('for');
  return id ? wrapper.get(`[id="${id}"]`) : field!.get('input, select');
};

const selectedResult = (wrapper: VueWrapper) => wrapper.get('section[aria-label="Resultado selecionado"]');

const biochemistryRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'diag_bio_1', accountId: 'acc_1', encounterId: 'enc_1', patientId: 'patient_1',
  examType: 'Bioquimico', examCatalogId: 'cat_002', reason: 'Perfil bioquimico', status: 'resulted',
  resultValues: [{ parameter: 'ALT', value: '92', unit: 'U/L', outOfRange: false }],
  createdAt: '2026-04-24T08:30:00.000Z', updatedAt: '2026-04-25T10:00:00.000Z',
  ...overrides
}) as unknown as Awaited<ReturnType<typeof laboratoryService.listBiochemistry>>[number];

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('Laboratory analytical result pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(patientService.getById).mockRejectedValue(new Error('Patient unavailable'));
    vi.mocked(ownerService.getById).mockRejectedValue(new Error('Owner unavailable'));
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

  it('renders hemograms with examination selection, references and preserved filters', async () => {
    const wrapper = mount(LaboratoryHemogramsPage);
    await flushPromises();
    await selectResult(wrapper);

    expect(wrapper.text()).toContain('Hemogramas');
    expect(wrapper.text()).toContain('Código do Hemograma');
    expect(wrapper.text()).toContain('Tutor');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Data da análise (UTC)');
    expect(wrapper.text()).toContain('Data de entrada (UTC)');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).toContain('Hemacias');
    expect(wrapper.text()).toContain('Leucocitos');
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

    await filterInput(wrapper, 'Código').setValue('diag');
    await filterInput(wrapper, 'Corpo do resultado').setValue('Hemacias');
    await filterInput(wrapper, 'Data da análise').setValue('2026-04-25');
    await filterInput(wrapper, 'Data de entrada').setValue('2026-04-24');
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

  it('renders the selected urinalysis without invented parameter categories', async () => {
    const wrapper = mount(LaboratoryUrinalysisPage);
    await flushPromises();
    await selectResult(wrapper);

    expect(wrapper.text()).toContain('Urina');
    expect(wrapper.text()).toContain('Código do Exame');
    expect(wrapper.text()).toContain('Tutor');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Data da análise (UTC)');
    expect(wrapper.text()).toContain('Data de entrada (UTC)');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).toContain('Densidade urinaria');
    expect(wrapper.text()).toContain('pH urinario');
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

    await filterInput(wrapper, 'Código').setValue('diag');
    await filterInput(wrapper, 'Corpo do resultado').setValue('Densidade');
    await filterInput(wrapper, 'Data da análise').setValue('2026-04-25');
    await filterInput(wrapper, 'Data de entrada').setValue('2026-04-24');
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

  it('renders selected biochemistry with its own structured values', async () => {
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    await selectResult(wrapper);

    expect(wrapper.text()).toContain('Bioquímico');
    expect(wrapper.text()).toContain('Código do Exame');
    expect(wrapper.text()).toContain('Tutor');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Data da análise (UTC)');
    expect(wrapper.text()).toContain('Data de entrada (UTC)');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).toContain('Resultado estruturado');
    expect(wrapper.text()).toContain('ALT');
    expect(wrapper.text()).toContain('92');
    expect(wrapper.text()).toContain('Creatinina');
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

    await filterInput(wrapper, 'Código').setValue('diag');
    await filterInput(wrapper, 'Corpo do resultado').setValue('ALT');
    await filterInput(wrapper, 'Data da análise').setValue('2026-04-25');
    await filterInput(wrapper, 'Data de entrada').setValue('2026-04-24');
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
    await selectResult(wrapper);
    expect(wrapper.text()).toContain('92');

    await filterInput(wrapper, 'Corpo do resultado').setValue('ALT');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    await selectResult(wrapper);
    expect(wrapper.text()).toContain('92');
    expect(laboratoryService.listBiochemistry).toHaveBeenLastCalledWith({
      code: undefined,
      finalizedAt: undefined,
      enteredAt: undefined,
      body: 'ALT',
      closed: true
    });
  });

  it('keeps a newer legacy summary separate from an older patient’s structured examination', async () => {
    vi.mocked(laboratoryService.listBiochemistry).mockResolvedValue([
      biochemistryRecord({ id: 'bio-new', resultValues: [], resultSummary: 'ALT: 999', updatedAt: '2026-04-26T10:00:00Z' }),
      biochemistryRecord({ id: 'bio-old', patientId: 'patient_2', resultSummary: undefined,
        resultValues: [{ parameter: 'Creatinina', value: '1.7', unit: 'mg/dL', outOfRange: true }] })
    ]);
    const patients = await patientService.list();
    vi.mocked(patientService.list).mockResolvedValue([
      ...patients, { ...patients[0], id: 'patient_2', name: 'Thor' }
    ]);
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    await selectResult(wrapper);
    expect(selectedResult(wrapper).text()).toContain('Mel');
    expect(selectedResult(wrapper).text()).toContain('bio-new');
    expect(selectedResult(wrapper).text()).toContain('ALT: 999');
    expect(selectedResult(wrapper).text()).not.toContain('Creatinina');
    expect(selectedResult(wrapper).find('tbody').exists()).toBe(false);
    await selectResult(wrapper, 1);
    expect(selectedResult(wrapper).text()).toContain('Thor');
    expect(selectedResult(wrapper).text()).toContain('bio-old');
    expect(selectedResult(wrapper).text()).toContain('Creatinina');
    expect(selectedResult(wrapper).text()).toContain('1.7');
    expect(selectedResult(wrapper).text()).not.toContain('ALT: 999');
    expect(selectedResult(wrapper).text()).not.toContain('Mel');
  });

  it('renders explicit range flags and leaves omitted flags unknown without borrowing catalog references', async () => {
    vi.mocked(laboratoryService.listBiochemistry).mockResolvedValue([biochemistryRecord({
      resultValues: [
        { parameter: 'ALT', value: '999', unit: 'U/L' },
        { parameter: 'Creatinina', value: '1.3', unit: 'mg/dL', outOfRange: true },
        { parameter: 'Glicose', value: '999', unit: 'mg/dL', outOfRange: false }
      ]
    })]);
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    await selectResult(wrapper);
    const rows = selectedResult(wrapper).findAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[0].text()).toContain('Não informada');
    expect(rows[0].text()).not.toContain('125');
    expect(rows[1].text()).toMatch(/fora|alterad/i);
    expect(rows[2].text()).toMatch(/dentro|normal/i);
    expect(wrapper.text()).toContain('Referências cadastradas');
  });

  it('preserves structured results while explicitly reporting a reference catalog failure', async () => {
    vi.mocked(laboratoryService.listReferenceValues).mockRejectedValueOnce(new Error('Reference unavailable'));
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    await selectResult(wrapper);
    expect(selectedResult(wrapper).text()).toContain('92');
    expect(selectedResult(wrapper).text()).toContain('10-125 U/L');
    expect(wrapper.text()).toMatch(/referências.{0,90}(indispon|carregar|falh)|(?:indispon|carregar|falh).{0,90}referências/i);
    expect(wrapper.find('[data-testid="data-table-feedback"] .empty-state__title').text()).toBe('Referências indisponíveis');
    expect(wrapper.findAll('[role="alert"]').filter((node) => node.text().includes('Referências indisponíveis'))).toHaveLength(1);
    expect(wrapper.findAll('button').filter((button) => button.text() === 'Tentar novamente')).toHaveLength(1);
  });

  it('retries only the reference catalog and keeps the selected result while it is pending', async () => {
    type References = Awaited<ReturnType<typeof laboratoryService.listReferenceValues>>;
    const retry = deferred<References>();
    vi.mocked(laboratoryService.listReferenceValues)
      .mockRejectedValueOnce(new Error('Reference unavailable'))
      .mockReturnValueOnce(retry.promise);
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    await selectResult(wrapper);

    const selectedBeforeRetry = selectedResult(wrapper).text();
    const retryButton = wrapper.get('[data-testid="data-table-feedback"] button');
    await retryButton.trigger('click');
    await wrapper.vm.$nextTick();
    expect(selectedResult(wrapper).text()).toContain('92');
    expect(selectedResult(wrapper).text()).toBe(selectedBeforeRetry);
    expect(retryButton.attributes('aria-busy')).toBe('true');

    retry.resolve([
      { id: 'ref-bio-retry', parameter: 'ALT', examType: 'BIO', minValue: 10, maxValue: 125, unit: 'U/L' }
    ]);
    await flushPromises();
    expect(wrapper.find('.lab-references [data-testid="data-table-feedback"]').exists()).toBe(false);
    expect(wrapper.find('.lab-references tbody').text()).toContain('ALT');
    expect(selectedResult(wrapper).text()).toBe(selectedBeforeRetry);
  });

  it('uses one terminal table feedback surface for a primary examination failure', async () => {
    vi.mocked(laboratoryService.listBiochemistry).mockRejectedValueOnce(new Error('Source unavailable'));
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();

    expect(wrapper.find('[data-testid="data-table-feedback"] .empty-state__title').text())
      .toBe('Não foi possível carregar os exames');
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
    expect(wrapper.findAll('button').filter((button) => button.text() === 'Tentar novamente')).toHaveLength(1);
  });

  it('clears populated records and selected detail on source failure and retains failure after dismissing feedback', async () => {
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    await selectResult(wrapper);
    expect(selectedResult(wrapper).text()).toContain('92');
    vi.mocked(laboratoryService.listBiochemistry).mockRejectedValueOnce(new Error('Source unavailable'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('section[aria-label="Resultado selecionado"]').exists()).toBe(false);
    expect(wrapper.findAll('button').filter((button) => button.text() === 'Ver resultado')).toHaveLength(0);
    expect(wrapper.text()).toMatch(/não foi possível|falha|erro ao/i);
    const dismiss = wrapper.findAll('button').find((button) => /fechar|dispensar/i.test(`${button.text()} ${button.attributes('aria-label') ?? ''}`));
    if (dismiss) await dismiss.trigger('click');
    expect(wrapper.text()).toMatch(/não foi possível|falha|erro ao/i);
    expect(wrapper.text()).not.toMatch(/nenhum exame|nenhum resultado/i);
  });

  it('ignores an older successful response after a newer search completes', async () => {
    type Records = Awaited<ReturnType<typeof laboratoryService.listBiochemistry>>;
    const first = deferred<Records>();
    const second = deferred<Records>();
    vi.mocked(laboratoryService.listBiochemistry)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const wrapper = mount(LaboratoryBiochemistryPage);
    await filterInput(wrapper, 'Código').setValue('current');
    await wrapper.find('form').trigger('submit');
    second.resolve([biochemistryRecord({ id: 'current-exam', resultSummary: 'Current result' })]);
    await flushPromises();
    await selectResult(wrapper);
    first.resolve([biochemistryRecord({ id: 'obsolete-exam', resultSummary: 'Obsolete result' })]);
    await flushPromises();
    expect(wrapper.text()).toContain('current-exam');
    expect(wrapper.text()).not.toContain('obsolete-exam');
    expect(selectedResult(wrapper).text()).toContain('Current result');
    wrapper.unmount();
  });

  it('does not present identity lookup failure as an empty match for an animal name filter', async () => {
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    vi.mocked(patientService.list).mockRejectedValue(new Error('Patient lookup unavailable'));
    await filterInput(wrapper, 'Animal').setValue('Mel');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toMatch(/pacientes|identifica|animais/i);
    expect(wrapper.text()).toMatch(/não foi possível|indispon|falha/i);
    expect(wrapper.text()).not.toMatch(/nenhum exame|nenhum resultado/i);
    expect(wrapper.find('section[aria-label="Resultado selecionado"]').exists()).toBe(false);
  });


  it('ignores an obsolete request failure after a newer result succeeds', async () => {
    type Records = Awaited<ReturnType<typeof laboratoryService.listBiochemistry>>;
    const obsolete = deferred<Records>();
    vi.mocked(laboratoryService.listBiochemistry)
      .mockReturnValueOnce(obsolete.promise)
      .mockResolvedValueOnce([biochemistryRecord({ id: 'current-exam' })]);
    const wrapper = mount(LaboratoryBiochemistryPage);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await selectResult(wrapper);
    obsolete.reject(new Error('Obsolete request failed'));
    await flushPromises();
    expect(selectedResult(wrapper).text()).toContain('current-exam');
    expect(wrapper.text()).not.toContain('Obsolete request failed');
    wrapper.unmount();
  });


  it('sends closed false when searching examinations that are not concluded', async () => {
    const wrapper = mount(LaboratoryHemogramsPage);
    await flushPromises();
    const status = filterInput(wrapper, 'Situação');
    const option = status.findAll('option').find((candidate) => candidate.text() === 'Não concluídos');
    expect(option).toBeDefined();
    await status.setValue(option!.element.value);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(laboratoryService.listHemograms).toHaveBeenLastCalledWith({
      code: undefined, finalizedAt: undefined, enteredAt: undefined, body: undefined, closed: false
    });
  });

  it('distinguishes forbidden analytical access from a temporary failure', async () => {
    vi.mocked(laboratoryService.listHemograms).mockRejectedValueOnce({ status: 403 });
    const wrapper = mount(LaboratoryHemogramsPage);
    await flushPromises();

    expect(wrapper.get('[data-testid="data-table-feedback"] .empty-state__title').text())
      .toBe('Acesso aos exames negado');
    expect(wrapper.text()).not.toContain('Não foi possível carregar os exames');
    expect(wrapper.get('[data-testid="data-table-feedback"]').text()).not.toContain('Tentar novamente');
    expect(wrapper.find('.lab-references').exists()).toBe(false);
  });

  it('keeps pending results visible in the open view and separates filtered absence', async () => {
    const concluded = {
      id: 'diag_hem_concluded', accountId: 'acc_1', encounterId: 'enc_1', patientId: 'patient_1',
      examType: 'Hemograma', examCatalogId: 'cat_001', reason: 'Check-up', status: 'resulted',
      resultSummary: 'Resultado concluído', resultValues: [{ parameter: 'Hemacias', value: '6.2', unit: 'milhoes/uL', outOfRange: false }],
      createdAt: '2026-04-24T08:30:00.000Z', updatedAt: '2026-04-25T10:00:00.000Z'
    };
    const pending = {
      ...concluded, id: 'diag_hem_pending', status: 'collected', resultSummary: undefined, resultValues: []
    } as never;
    vi.mocked(laboratoryService.listHemograms).mockImplementation(async (filters) => {
      if (filters?.closed === false && filters.code === 'ausente') return [];
      return filters?.closed === false ? [pending] : [concluded as never];
    });

    const wrapper = mount(LaboratoryHemogramsPage);
    await flushPromises();
    await filterInput(wrapper, 'Situação').setValue('open');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Coletado');
    expect(selectedResult(wrapper).text()).toContain('Sem valores estruturados');
    expect(laboratoryService.listHemograms).toHaveBeenLastCalledWith(expect.objectContaining({ closed: false }));

    await filterInput(wrapper, 'Código').setValue('ausente');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('[data-testid="data-table-feedback"] .empty-state__title').text())
      .toBe('Nenhum exame corresponde aos filtros');
    expect(wrapper.find('section[aria-label="Resultado selecionado"]').exists()).toBe(false);
  });


  it('resolves an examination patient omitted from the first list page before filtering by animal name', async () => {
    const [patient] = await patientService.list();
    vi.mocked(patientService.list).mockResolvedValue([]);
    vi.mocked(patientService.getById).mockResolvedValue(patient);
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    await filterInput(wrapper, 'Animal').setValue('Mel');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(patientService.getById).toHaveBeenCalledWith('patient_1');
    expect(selectedResult(wrapper).text()).toContain('Mel');
    expect(selectedResult(wrapper).text()).toContain('diag_bio_1');
    expect(wrapper.text()).not.toContain('Nenhum exame encontrado');
  });

  it('resolves an examination tutor omitted from the first list page before filtering by tutor name', async () => {
    const [owner] = await ownerService.list();
    vi.mocked(ownerService.list).mockResolvedValue([]);
    vi.mocked(ownerService.getById).mockResolvedValue(owner);
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    await filterInput(wrapper, 'Tutor').setValue('Cliente Exemplo');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(ownerService.getById).toHaveBeenCalledWith('owner_1');
    expect(selectedResult(wrapper).text()).toContain('Cliente Exemplo');
    expect(selectedResult(wrapper).text()).toContain('diag_bio_1');
    expect(wrapper.text()).not.toContain('Nenhum exame encontrado');
  });

  it.each(['Animal', 'Tutor'])('reports unresolved %s identity rather than a false empty filtered result', async (filter) => {
    if (filter === 'Animal') vi.mocked(patientService.list).mockResolvedValue([]);
    else vi.mocked(ownerService.list).mockResolvedValue([]);
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    expect(wrapper.text()).toMatch(/identifica.{0,60}(indispon|incomplet)|(?:indispon|incomplet).{0,60}identifica/i);
    await filterInput(wrapper, filter).setValue(filter === 'Animal' ? 'Mel' : 'Cliente Exemplo');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toMatch(/não foi possível|indispon|falha/i);
    expect(wrapper.text()).not.toContain('Nenhum exame encontrado');
    expect(wrapper.find('section[aria-label="Resultado selecionado"]').exists()).toBe(false);
  });

  it.each(['Animal', 'Tutor'])('rejects a mismatched exact identity response for the %s filter', async (filter) => {
    if (filter === 'Animal') {
      const [patient] = await patientService.list();
      vi.mocked(patientService.list).mockResolvedValue([]);
      vi.mocked(patientService.getById).mockResolvedValue({ ...patient, id: 'wrong-patient' });
    } else {
      const [owner] = await ownerService.list();
      vi.mocked(ownerService.list).mockResolvedValue([]);
      vi.mocked(ownerService.getById).mockResolvedValue({ ...owner, id: 'wrong-owner' });
    }
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    await filterInput(wrapper, filter).setValue(filter === 'Animal' ? 'Mel' : 'Cliente Exemplo');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toMatch(/não foi possível|indispon|falha/i);
    expect(wrapper.text()).not.toContain('Nenhum exame encontrado');
    expect(wrapper.find('section[aria-label="Resultado selecionado"]').exists()).toBe(false);
  });

  it('does not let a delayed old patient lookup overwrite the newer examination and identity', async () => {
    const [patient] = await patientService.list();
    const obsolete = deferred<Awaited<ReturnType<typeof patientService.getById>>>();
    vi.mocked(patientService.list).mockResolvedValue([]);
    vi.mocked(patientService.getById).mockImplementation((id) => id === 'patient_1'
      ? obsolete.promise : Promise.resolve({ ...patient, id: 'patient_2', name: 'Thor' }));
    vi.mocked(laboratoryService.listBiochemistry)
      .mockResolvedValueOnce([biochemistryRecord({ id: 'old-exam' })])
      .mockResolvedValueOnce([biochemistryRecord({ id: 'new-exam', patientId: 'patient_2' })]);
    const wrapper = mount(LaboratoryBiochemistryPage);
    await flushPromises();
    expect(patientService.getById).toHaveBeenCalledWith('patient_1');
    await filterInput(wrapper, 'Código').setValue('new-exam');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(selectedResult(wrapper).text()).toContain('Thor');
    obsolete.resolve(patient);
    await flushPromises();
    expect(selectedResult(wrapper).text()).toContain('new-exam');
    expect(selectedResult(wrapper).text()).toContain('Thor');
    expect(selectedResult(wrapper).text()).not.toContain('Mel');
    expect(wrapper.text()).not.toContain('old-exam');
    wrapper.unmount();
  });

});
