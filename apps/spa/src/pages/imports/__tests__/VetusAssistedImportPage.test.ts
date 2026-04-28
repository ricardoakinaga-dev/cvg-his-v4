import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VetusAssistedImportPage from '../VetusAssistedImportPage.vue';
import { vetusImportService } from '@/services/vetusImport';

vi.mock('@/services/vetusImport', () => ({
  vetusImportService: {
    list: vi.fn(),
    create: vi.fn()
  }
}));

describe('VetusAssistedImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vetusImportService.list).mockResolvedValue([
      {
        id: 'vetusimport-1',
        accountId: 'acc-1',
        sourceSystem: 'Vetus',
        sourceReference: 'planilha-animais-abril',
        status: 'imported',
        ownerId: 'owner-1',
        ownerName: 'Maria Silva',
        patientId: 'patient-1',
        patientName: 'Luna',
        importedByUserId: 'user-1',
        reviewedBy: 'Maria Recepcao',
        importedAt: '2026-04-28T10:00:00Z',
        summary: 'Cliente criado; animal criado'
      }
    ]);
    vi.mocked(vetusImportService.create).mockResolvedValue({
      id: 'vetusimport-2',
      accountId: 'acc-1',
      sourceSystem: 'Vetus',
      sourceReference: 'planilha-animais-abril',
      status: 'imported',
      ownerId: 'owner-1',
      ownerName: 'Maria Silva',
      patientId: 'patient-1',
      patientName: 'Luna',
      importedByUserId: 'user-1',
      reviewedBy: 'Maria Recepcao',
      importedAt: '2026-04-28T10:05:00Z',
      summary: 'Cliente criado; animal criado'
    });
  });

  it('renders the Vetus assisted import controls', async () => {
    const wrapper = mount(VetusAssistedImportPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Importação Assistida Vetus');
    expect(wrapper.text()).toContain('Modelo CSV');
    expect(wrapper.text()).toContain('Arquivo');
    expect(wrapper.text()).toContain('Dados');
    expect(wrapper.text()).toContain('Validar');
    expect(wrapper.text()).toContain('Importar');
    expect(wrapper.text()).toContain('Maria Silva');
    expect(wrapper.text()).toContain('Luna');
  });

  it('validates pasted Vetus rows and previews owner, animal and review source', async () => {
    const wrapper = mount(VetusAssistedImportPage);
    await flushPromises();

    await wrapper.find('textarea').setValue(
      'ID Cliente Vetus;Cliente;Telefone;Email;ID Animal Vetus;Animal;Especie;Raca;Sexo;Peso;Historico;Origem;Revisor\n' +
      '3835;Maria Silva;(11) 99999-1111;maria@example.com;10115;Luna;Canina;SRD;Femea;12,4;Historico Vetus;planilha-animais-abril;Maria Recepcao'
    );
    await wrapper.findAll('button').find((button) => button.text() === 'Validar')!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('3835');
    expect(wrapper.text()).toContain('Maria Silva');
    expect(wrapper.text()).toContain('10115');
    expect(wrapper.text()).toContain('Luna');
    expect(wrapper.text()).toContain('planilha-animais-abril');
    expect(wrapper.text()).toContain('Maria Recepcao');
    expect(wrapper.text()).toContain('Pronto');
  });

  it('imports valid rows through the Vetus import API', async () => {
    const wrapper = mount(VetusAssistedImportPage);
    await flushPromises();

    await wrapper.find('textarea').setValue(
      'ID Cliente Vetus;Cliente;Telefone;Email;ID Animal Vetus;Animal;Especie;Raca;Sexo;Peso;Historico;Origem;Revisor\n' +
      '3835;Maria Silva;(11) 99999-1111;maria@example.com;10115;Luna;Canina;SRD;Femea;12,4;Historico Vetus;planilha-animais-abril;Maria Recepcao'
    );
    await wrapper.findAll('button').find((button) => button.text() === 'Validar')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Importar')!.trigger('click');
    await flushPromises();

    expect(vetusImportService.create).toHaveBeenCalledWith({
      sourceSystem: 'Vetus',
      sourceReference: 'planilha-animais-abril',
      reviewedBy: 'Maria Recepcao',
      owner: {
        legacyVetusId: '3835',
        fullName: 'Maria Silva',
        phone: '(11) 99999-1111',
        email: 'maria@example.com'
      },
      patient: {
        legacyVetusId: '10115',
        name: 'Luna',
        species: 'Canina',
        breed: 'SRD',
        sex: 'female',
        baseWeightKg: 12.4,
        generalNotes: 'Historico Vetus'
      }
    });
    expect(wrapper.text()).toContain('1 registro(s) importado(s).');
    expect(wrapper.text()).toContain('Importado');
    expect(vetusImportService.list).toHaveBeenCalledTimes(2);
  });

  it('does not show success when every Vetus row import fails', async () => {
    vi.mocked(vetusImportService.create).mockRejectedValueOnce(new Error('Importação recusada'));
    const wrapper = mount(VetusAssistedImportPage);
    await flushPromises();

    await wrapper.find('textarea').setValue(
      'ID Cliente Vetus;Cliente;Telefone;Email;ID Animal Vetus;Animal;Especie;Raca;Sexo;Peso;Historico;Origem;Revisor\n' +
      '3835;Maria Silva;(11) 99999-1111;maria@example.com;10115;Luna;Canina;SRD;Femea;12,4;Historico Vetus;planilha-animais-abril;Maria Recepcao'
    );
    await wrapper.findAll('button').find((button) => button.text() === 'Validar')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Importar')!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('0 registro(s) importado(s).');
    expect(wrapper.text()).toContain('1 registro(s) não foram importados.');
    expect(wrapper.text()).toContain('Importação recusada');
  });
});
