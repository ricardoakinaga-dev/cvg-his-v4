import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VaccinesDewormersPage from '../VaccinesDewormersPage.vue';
import {
  vaccinesDewormersService,
  type PreventiveEventSummary
} from '@/services/vaccinesDewormers';

const mockRouteQuery = vi.hoisted(() => ({} as Record<string, string>));

vi.mock('@/services/vaccinesDewormers', async () => {
  const actual = await vi.importActual<typeof import('@/services/vaccinesDewormers')>(
    '@/services/vaccinesDewormers'
  );
  return {
    ...actual,
    vaccinesDewormersService: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      execute: vi.fn(),
      prepareEmail: vi.fn(),
      prepareBulkEmail: vi.fn()
    }
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: mockRouteQuery
  })
}));

const scheduledEvent: PreventiveEventSummary = {
  id: 'prev-1',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  clientName: 'Maria Silva',
  animalName: 'Rex',
  eventDate: '2026-04-24',
  itemType: 'vaccine',
  description: 'Vacina V10 - reforço anual',
  status: 'scheduled',
  observation: 'Avisar tutor com 3 dias de antecedência.',
  executedAt: null,
  executedObservation: null,
  rescheduledFromId: null,
  reminderEmailPreparedAt: null,
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z'
};

const executedEvent: PreventiveEventSummary = {
  ...scheduledEvent,
  id: 'prev-2',
  clientName: 'Carla Nogueira',
  animalName: 'Nina',
  description: 'Antirrábica',
  status: 'executed',
  executedAt: '2026-04-12T10:00:00Z'
};

const todayEvent: PreventiveEventSummary = {
  ...scheduledEvent,
  id: 'prev-today',
  clientName: 'Hoje Cliente',
  animalName: 'Hoje Pet',
  description: 'Vacina vence hoje',
  eventDate: new Date().toISOString().slice(0, 10)
};

function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('VaccinesDewormersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockRouteQuery)) {
      delete mockRouteQuery[key];
    }
    vi.mocked(vaccinesDewormersService.list).mockResolvedValue([scheduledEvent]);
    vi.mocked(vaccinesDewormersService.create).mockResolvedValue(scheduledEvent);
    vi.mocked(vaccinesDewormersService.update).mockResolvedValue(scheduledEvent);
    vi.mocked(vaccinesDewormersService.delete).mockResolvedValue(undefined);
    vi.mocked(vaccinesDewormersService.execute).mockResolvedValue({
      event: { ...scheduledEvent, status: 'executed' },
      rescheduledEvent: null
    });
    vi.mocked(vaccinesDewormersService.prepareEmail).mockResolvedValue(scheduledEvent);
    vi.mocked(vaccinesDewormersService.prepareBulkEmail).mockResolvedValue({
      preparedCount: 1,
      preparedAt: '2026-04-01T10:00:00Z'
    });
  });

  it('renders the Vetus-like preventive list, filters and actions', async () => {
    const wrapper = mount(VaccinesDewormersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Vacinas e Vermífugos');
    expect(wrapper.text()).toContain('Data Inicial');
    expect(wrapper.text()).toContain('Data Final');
    expect(wrapper.text()).toContain('Cliente (branco = Todos)');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Tipo');
    expect(wrapper.text()).toContain('Pesquisar aplicações executadas');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Agendar Vacina ou Vermífugo');
    expect(wrapper.text()).toContain('Enviar Email de Aviso');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Data');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Agenda');
    expect(wrapper.text()).toContain('Vínculo');
    expect(wrapper.text()).toContain('Aviso');
    expect(wrapper.text()).toContain('Executar');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Email');
    expect(wrapper.text()).toContain('Vacina V10 - reforço anual');
    expect(wrapper.text()).toContain('Vencido');
    expect(wrapper.text()).toContain('Aviso pendente');
    expect(wrapper.text()).toContain('Abrir paciente');
    expect(wrapper.text()).toContain('Abrir tutor');
    expect(wrapper.find('a[href="/patients/pat-1"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/owners/owner-1"]').exists()).toBe(true);
    expect(vaccinesDewormersService.list).toHaveBeenCalledWith({
      dateFrom: undefined,
      dateTo: undefined,
      client: undefined,
      animal: undefined,
      patientId: undefined,
      ownerId: undefined,
      itemType: undefined,
      includeExecuted: false
    });
  });

  it('opens the scheduling and execution dialogs', async () => {
    const wrapper = mount(VaccinesDewormersPage);
    await flushPromises();

    const scheduleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Agendar Vacina ou Vermífugo'));
    expect(scheduleButton).toBeTruthy();
    await scheduleButton!.trigger('click');
    expect(wrapper.text()).toContain('Agendamento');
    expect(wrapper.text()).toContain('Vacina/Vermífugo');
    expect(wrapper.text()).toContain('Salvar');
    expect(wrapper.text()).toContain('Excluir');

    await wrapper.find('.ds-modal__close').trigger('click');

    const executeButton = wrapper.findAll('button').find((button) => button.text() === 'Executar');
    expect(executeButton).toBeTruthy();
    await executeButton!.trigger('click');
    expect(wrapper.text()).toContain('Baixar e Reagendar');
    expect(wrapper.text()).toContain('Observação');
    expect(wrapper.text()).toContain('Reagendar para');
    expect(wrapper.text()).toContain('Baixar');
  });

  it('can include executed applications in the search', async () => {
    vi.mocked(vaccinesDewormersService.list)
      .mockResolvedValueOnce([scheduledEvent])
      .mockResolvedValueOnce([scheduledEvent, executedEvent]);

    const wrapper = mount(VaccinesDewormersPage);
    await flushPromises();

    expect(wrapper.text()).not.toContain('Antirrábica');

    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(vaccinesDewormersService.list).toHaveBeenLastCalledWith({
      dateFrom: undefined,
      dateTo: undefined,
      client: undefined,
      animal: undefined,
      patientId: undefined,
      ownerId: undefined,
      itemType: undefined,
      includeExecuted: true
    });
    expect(wrapper.text()).toContain('Antirrábica');
    expect(wrapper.text()).toContain('Executada');
    expect(wrapper.text()).toContain('Executada em 12/04/2026');
  });

  it('filters the loaded preventive agenda with quick operational filters', async () => {
    vi.mocked(vaccinesDewormersService.list).mockResolvedValueOnce([
      scheduledEvent,
      todayEvent,
      {
        ...scheduledEvent,
        id: 'prev-next-week',
        clientName: 'Semana Cliente',
        animalName: 'Semana Pet',
        description: 'Vermífugo em breve',
        itemType: 'dewormer',
        eventDate: daysFromToday(3),
        reminderEmailPreparedAt: '2026-05-20T09:00:00Z'
      },
      executedEvent
    ]);

    const wrapper = mount(VaccinesDewormersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Filtros rápidos');
    expect(wrapper.text()).toContain('Vencidos');
    expect(wrapper.text()).toContain('Vence hoje');
    expect(wrapper.text()).toContain('Próximos 7 dias');
    expect(wrapper.text()).toContain('Sem aviso');

    await wrapper.findAll('button').find((button) => button.text() === 'Vence hoje')?.trigger('click');
    expect(wrapper.text()).toContain('Vacina vence hoje');
    expect(wrapper.text()).not.toContain('Vacina V10 - reforço anual');
    expect(wrapper.text()).not.toContain('Vermífugo em breve');

    await wrapper.findAll('button').find((button) => button.text() === 'Próximos 7 dias')?.trigger('click');
    expect(wrapper.text()).toContain('Vacina vence hoje');
    expect(wrapper.text()).toContain('Vermífugo em breve');
    expect(wrapper.text()).not.toContain('Antirrábica');

    await wrapper.findAll('button').find((button) => button.text() === 'Sem aviso')?.trigger('click');
    expect(wrapper.text()).toContain('Vacina V10 - reforço anual');
    expect(wrapper.text()).toContain('Vacina vence hoje');
    expect(wrapper.text()).not.toContain('Vermífugo em breve');

    await wrapper.findAll('button').find((button) => button.text() === 'Todos rápidos')?.trigger('click');
    expect(wrapper.text()).toContain('Vacina V10 - reforço anual');
    expect(wrapper.text()).toContain('Vacina vence hoje');
    expect(wrapper.text()).toContain('Vermífugo em breve');
  });

  it('shows reminder preparation status when an email was prepared', async () => {
    vi.mocked(vaccinesDewormersService.list).mockResolvedValueOnce([
      {
        ...scheduledEvent,
        reminderEmailPreparedAt: '2026-04-20T09:00:00Z'
      }
    ]);

    const wrapper = mount(VaccinesDewormersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Aviso preparado em 20/04/2026');
  });

  it('uses patient and owner query filters for patient-context navigation', async () => {
    mockRouteQuery.patientId = 'pat-1';
    mockRouteQuery.ownerId = 'owner-1';

    mount(VaccinesDewormersPage);
    await flushPromises();

    expect(vaccinesDewormersService.list).toHaveBeenCalledWith({
      dateFrom: undefined,
      dateTo: undefined,
      client: undefined,
      animal: undefined,
      patientId: 'pat-1',
      ownerId: 'owner-1',
      itemType: undefined,
      includeExecuted: false
    });
  });
});
