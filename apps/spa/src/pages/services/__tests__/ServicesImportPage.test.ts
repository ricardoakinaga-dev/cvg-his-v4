import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ServicesImportPage from '../ServicesImportPage.vue';
import { servicesService } from '@/services/services';

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('@/services/services', () => ({
  servicesService: {
    create: vi.fn()
  }
}));

describe('ServicesImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(servicesService.create).mockResolvedValue({
      id: 'svc-1',
      accountId: 'acc-1',
      name: 'Consulta Veterinária',
      code: 'CONS-001',
      description: null,
      basePrice: 150,
      active: true,
      createdAt: '2026-04-01T10:00:00Z',
      updatedAt: '2026-04-01T10:00:00Z'
    });
  });

  it('renders the Vetus-aligned service import controls', () => {
    const wrapper = mount(ServicesImportPage);

    expect(wrapper.text()).toContain('Importar Dados Serviços');
    expect(wrapper.text()).toContain('Arquivo');
    expect(wrapper.text()).toContain('Dados');
    expect(wrapper.text()).toContain('Separador');
    expect(wrapper.text()).toContain('Serviços Ativos');
    expect(wrapper.text()).toContain('Validar');
    expect(wrapper.text()).toContain('Importar');
  });

  it('validates pasted service rows and previews the import table', async () => {
    const wrapper = mount(ServicesImportPage);

    await wrapper.find('textarea').setValue('Id;Descrição;Valor;Ativo\nCONS-001;Consulta Veterinária;150,00;Sim');
    await wrapper.findAll('button').find((button) => button.text() === 'Validar')!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('CONS-001');
    expect(wrapper.text()).toContain('Consulta Veterinária');
    expect(wrapper.text()).toMatch(/R\$\s*150,00/);
    expect(wrapper.text()).toContain('Pronto');
  });

  it('imports valid rows through the services API', async () => {
    const wrapper = mount(ServicesImportPage);

    await wrapper.find('textarea').setValue('Id;Descrição;Valor;Ativo\nCONS-001;Consulta Veterinária;150,00;Sim');
    await wrapper.findAll('button').find((button) => button.text() === 'Validar')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Importar')!.trigger('click');
    await flushPromises();

    expect(servicesService.create).toHaveBeenCalledWith({
      name: 'Consulta Veterinária',
      code: 'CONS-001',
      description: null,
      basePrice: 150,
      active: true
    });
    expect(wrapper.text()).toContain('1 serviço(s) importado(s).');
    expect(wrapper.text()).toContain('Importado');
  });
});
