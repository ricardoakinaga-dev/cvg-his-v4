import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportsEnginePage from '../ReportsEnginePage.vue';
import { reportsService } from '@/services/reports';

const mockRoute = vi.fn();

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => mockRoute()
  };
});

vi.mock('@/services/reports', () => ({
  reportsService: {
    listCatalog: vi.fn(),
    listExecutions: vi.fn(),
    listSchedules: vi.fn(),
    execute: vi.fn(),
    exportExecution: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    listScheduleDeliveries: vi.fn(),
    listScheduleDeliveryAlerts: vi.fn(),
    retryScheduleDelivery: vi.fn()
  }
}));

const definition = {
  id: 'administrative-executive',
  accountId: null,
  title: 'Executivo Administrativo',
  description: 'Resumo executivo',
  category: 'executive',
  requiredPermission: 'reports:read',
  supportedFormats: ['json', 'csv'],
  filterSchema: {
    dateFrom: 'date',
    dateTo: 'date'
  },
  columns: [
    { key: 'metric', label: 'Indicador', type: 'string' },
    { key: 'value', label: 'Valor', type: 'currency' }
  ],
  createdAt: '2026-05-28T10:00:00.000Z',
  updatedAt: '2026-05-28T10:00:00.000Z'
} as const;

const execution = {
  id: 'execution-1',
  accountId: 'account-1',
  reportId: definition.id,
  requestedByUserId: 'user-1',
  status: 'completed',
  filters: { dateFrom: '2026-05-01', dateTo: '2026-05-28' },
  rowCount: 1,
  generatedAt: '2026-05-28T10:05:00.000Z',
  expiresAt: '2026-05-29T10:05:00.000Z',
  columns: definition.columns,
  rows: [{ metric: 'Receita comercial', value: 1200 }]
} as const;

const emptyExecution = {
  ...execution,
  id: 'execution-empty',
  rowCount: 0,
  generatedAt: '2026-05-28T09:05:00.000Z',
  expiresAt: '2026-05-29T09:05:00.000Z'
} as const;

const existingSchedule = {
  id: 'schedule-existing',
  accountId: 'account-1',
  reportId: definition.id,
  name: 'Executivo diário monitorado',
  frequency: 'daily',
  format: 'csv',
  filters: {},
  recipients: ['diretoria@clinica.com', 'financeiro@clinica.com'],
  isActive: true,
  nextRunAt: '2026-05-29T10:07:00.000Z',
  lastRunAt: '2026-05-28T10:07:00.000Z',
  lastExecutionId: 'execution-last',
  lastError: 'SMTP indisponível',
  createdByUserId: 'user-1',
  createdAt: '2026-05-27T10:07:00.000Z',
  updatedAt: '2026-05-28T10:07:00.000Z'
} as const;

const healthySchedule = {
  ...existingSchedule,
  id: 'schedule-healthy',
  name: 'Executivo semanal saudável',
  frequency: 'weekly',
  recipients: ['gestao@clinica.com'],
  nextRunAt: '2026-06-04T10:07:00.000Z',
  lastRunAt: null,
  lastExecutionId: null,
  lastError: null
} as const;

describe('ReportsEnginePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.mockReturnValue({ query: {} });
    vi.mocked(reportsService.listCatalog).mockResolvedValue([definition]);
    vi.mocked(reportsService.listExecutions).mockResolvedValue([execution, emptyExecution]);
    vi.mocked(reportsService.listSchedules).mockResolvedValue([existingSchedule, healthySchedule]);
    vi.mocked(reportsService.execute).mockResolvedValue(execution);
    vi.mocked(reportsService.exportExecution).mockResolvedValue({
      id: 'export-1',
      accountId: 'account-1',
      executionId: execution.id,
      format: 'csv',
      filename: 'executivo-administrativo.csv',
      contentType: 'text/csv',
      content: 'metric,value',
      exportedByUserId: 'user-1',
      exportedAt: '2026-05-28T10:06:00.000Z'
    });
    vi.mocked(reportsService.createSchedule).mockResolvedValue({
      id: 'schedule-1',
      accountId: 'account-1',
      reportId: definition.id,
      name: 'Executivo semanal',
      frequency: 'weekly',
      format: 'csv',
      filters: {},
      recipients: ['diretoria@clinica.com'],
      isActive: true,
      nextRunAt: '2026-06-04T10:07:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-1',
      createdAt: '2026-05-28T10:07:00.000Z',
      updatedAt: '2026-05-28T10:07:00.000Z'
    });
    vi.mocked(reportsService.updateSchedule).mockResolvedValue({
      ...existingSchedule,
      isActive: false
    });
    vi.mocked(reportsService.listScheduleDeliveries).mockResolvedValue([
      {
        id: 'delivery-1',
        accountId: 'account-1',
        scheduleId: existingSchedule.id,
        executionId: 'execution-last',
        recipient: 'diretoria@clinica.com',
        status: 'sent',
        format: 'csv',
        deliveredAt: '2026-05-28T10:08:00.000Z',
        error: null,
        createdAt: '2026-05-28T10:08:00.000Z'
      },
      {
        id: 'delivery-2',
        accountId: 'account-1',
        scheduleId: existingSchedule.id,
        executionId: 'execution-last',
        recipient: 'financeiro@clinica.com',
        status: 'failed',
        format: 'csv',
        deliveredAt: '2026-05-27T10:08:00.000Z',
        error: 'SMTP indisponível',
        createdAt: '2026-05-27T10:08:00.000Z'
      },
      {
        id: 'delivery-3',
        accountId: 'account-1',
        scheduleId: existingSchedule.id,
        executionId: 'execution-last',
        recipient: 'operacoes@clinica.com',
        status: 'failed',
        format: 'csv',
        deliveredAt: '2026-05-28T10:12:00.000Z',
        error: 'Caixa postal cheia',
        createdAt: '2026-05-28T10:12:00.000Z'
      },
      {
        id: 'delivery-4',
        accountId: 'account-1',
        scheduleId: existingSchedule.id,
        executionId: 'execution-last',
        recipient: 'financeiro@clinica.com',
        status: 'failed',
        format: 'csv',
        deliveredAt: '2026-05-28T10:14:00.000Z',
        error: 'SMTP indisponível',
        createdAt: '2026-05-28T10:14:00.000Z'
      }
    ]);
    vi.mocked(reportsService.listScheduleDeliveryAlerts).mockResolvedValue([
      {
        id: `${existingSchedule.id}:financeiro@clinica.com`,
        accountId: 'account-1',
        scheduleId: existingSchedule.id,
        reportId: definition.id,
        recipient: 'financeiro@clinica.com',
        failureCount: 2,
        lastFailureAt: '2026-05-28T10:14:00.000Z',
        lastError: 'SMTP indisponível',
        severity: 'high'
      }
    ]);
    vi.mocked(reportsService.retryScheduleDelivery).mockImplementation(async (_scheduleId, deliveryId) => {
      const recipient = deliveryId === 'delivery-3' ? 'operacoes@clinica.com' : 'financeiro@clinica.com';
      return {
        id: `retry-${deliveryId}`,
        accountId: 'account-1',
        scheduleId: existingSchedule.id,
        executionId: 'execution-last',
        recipient,
        status: 'sent',
        format: 'csv',
        deliveredAt: '2026-05-28T11:00:00.000Z',
        error: null,
        createdAt: '2026-05-28T11:00:00.000Z'
      };
    });
  });

  it('loads catalog and executes the selected report', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    expect(wrapper.text()).toContain('Motor Enterprise de Relatórios');
    expect(wrapper.text()).toContain('Executivo Administrativo');
    expect(wrapper.text()).toContain('Execuções com dados');
    expect(wrapper.text()).toContain('Execuções vazias');
    expect(wrapper.text()).toContain('Agendamentos com falha');
    expect(wrapper.text()).toContain('Executivo diário monitorado');
    expect(wrapper.text()).toContain('Executivo semanal saudável');
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Falha no último envio');
    expect(wrapper.text()).toContain('SMTP indisponível');
    expect(wrapper.text()).toContain('2 destinatário(s)');

    await wrapper.findAll('button').find((button) => button.text() === 'Executar')?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: definition.id,
      filters: {
        dateFrom: expect.any(String),
        dateTo: expect.any(String)
      }
    });
    expect(wrapper.text()).toContain('Receita comercial');
    expect(wrapper.text()).toContain('R$');
  });

  it('exports and schedules a generated report', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Executar')?.trigger('click');
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Exportar CSV')?.trigger('click');
    await flushPromises();

    await wrapper.get('#schedule-name').setValue('Executivo semanal');
    await wrapper.get('#schedule-recipients').setValue('diretoria@clinica.com');
    await wrapper.findAll('button').find((button) => button.text() === 'Agendar relatório')?.trigger('click');
    await flushPromises();

    expect(reportsService.exportExecution).toHaveBeenCalledWith(execution.id, 'csv');
    expect(reportsService.createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: definition.id,
        name: 'Executivo semanal',
        recipients: ['diretoria@clinica.com']
      })
    );
    expect(wrapper.text()).toContain('Executivo semanal');
    expect(wrapper.text()).toContain('04/06/2026');
    expect(wrapper.text()).toContain('1 destinatário(s)');
  });

  it('pauses active report schedules from the operational table', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Pausar')?.trigger('click');
    await flushPromises();

    expect(reportsService.updateSchedule).toHaveBeenCalledWith(existingSchedule.id, { isActive: false });
    expect(wrapper.text()).toContain('Pausado');
  });

  it('filters report schedules with failures from the KPI action', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text().includes('Agendamentos com falha'))?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Filtro ativo: somente agendamentos com falha');
    expect(wrapper.text()).toContain('Executivo diário monitorado');
    expect(wrapper.text()).not.toContain('Executivo semanal saudável');

    await wrapper.findAll('button').find((button) => button.text() === 'Limpar filtro')?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Executivo semanal saudável');
  });

  it('loads delivery history for a scheduled report', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Entregas')?.trigger('click');
    await flushPromises();

    expect(reportsService.listScheduleDeliveries).toHaveBeenCalledWith(existingSchedule.id);
    expect(wrapper.text()).toContain('Histórico de entregas');
    expect(wrapper.text()).toContain('diretoria@clinica.com');
    expect(wrapper.text()).toContain('Enviado');
    expect(wrapper.text()).toContain('financeiro@clinica.com');
    expect(wrapper.text()).toContain('Falhou');
  });

  it('filters delivery history by status and period', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Entregas')?.trigger('click');
    await flushPromises();

    await wrapper.get('#delivery-status-filter').setValue('failed');
    await wrapper.get('#delivery-date-from').setValue('2026-05-27');
    await wrapper.get('#delivery-date-to').setValue('2026-05-27');
    await flushPromises();

    expect(wrapper.text()).toContain('financeiro@clinica.com');
    expect(wrapper.text()).toContain('SMTP indisponível');
    expect(wrapper.text()).not.toContain('diretoria@clinica.com');
  });

  it('summarizes delivery outcomes using the active filters', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Entregas')?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('4entregas no filtro');
    expect(wrapper.text()).toContain('1enviado(s)');
    expect(wrapper.text()).toContain('3falhado(s)');

    await wrapper.get('#delivery-status-filter').setValue('failed');
    await flushPromises();

    expect(wrapper.text()).toContain('3entregas no filtro');
    expect(wrapper.text()).toContain('0enviado(s)');
    expect(wrapper.text()).toContain('3falhado(s)');
  });

  it('reprocesses failed delivery rows from the delivery history', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Entregas')?.trigger('click');
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Reprocessar')?.trigger('click');
    await flushPromises();

    expect(reportsService.retryScheduleDelivery).toHaveBeenCalledWith(existingSchedule.id, 'delivery-2');
    expect(wrapper.text()).toContain('Entrega reprocessada para financeiro@clinica.com.');
    expect(wrapper.text()).toContain('5entregas no filtro');
    expect(wrapper.text()).toContain('2enviado(s)');
  });

  it('reprocesses all visible failed deliveries in batch', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Entregas')?.trigger('click');
    await flushPromises();

    await wrapper.get('#delivery-status-filter').setValue('failed');
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Reprocessar falhas filtradas')?.trigger('click');
    await flushPromises();

    expect(reportsService.retryScheduleDelivery).toHaveBeenCalledWith(existingSchedule.id, 'delivery-2');
    expect(reportsService.retryScheduleDelivery).toHaveBeenCalledWith(existingSchedule.id, 'delivery-3');
    expect(reportsService.retryScheduleDelivery).toHaveBeenCalledWith(existingSchedule.id, 'delivery-4');
    expect(wrapper.text()).toContain('3 entrega(s) reprocessada(s).');
    expect(wrapper.text()).toContain('0enviado(s)');

    await wrapper.findAll('button').find((button) => button.text() === 'Limpar filtros')?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('7entregas no filtro');
    expect(wrapper.text()).toContain('4enviado(s)');
  });

  it('shows recurring failed recipients using the active delivery filters', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Entregas')?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Falhas recorrentes por destinatário');
    expect(wrapper.text()).toContain('financeiro@clinica.com');
    expect(wrapper.text()).toContain('2 falha(s)');
    expect(wrapper.text()).toContain('operacoes@clinica.com');
    expect(wrapper.text()).toContain('1 falha(s)');

    await wrapper.get('#delivery-date-from').setValue('2026-05-28');
    await flushPromises();

    expect(wrapper.text()).toContain('financeiro@clinica.com');
    expect(wrapper.text()).toContain('1 falha(s)');
  });

  it('loads operational delivery alerts for recurring failures', async () => {
    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Entregas')?.trigger('click');
    await flushPromises();

    expect(reportsService.listScheduleDeliveryAlerts).toHaveBeenCalledWith(existingSchedule.id);
    expect(wrapper.text()).toContain('Alertas operacionais');
    expect(wrapper.text()).toContain('financeiro@clinica.com');
    expect(wrapper.text()).toContain('2 falha(s)');
    expect(wrapper.text()).toContain('Alta');
  });

  it('opens a scheduled report delivery context from route query', async () => {
    mockRoute.mockReturnValueOnce({
      query: {
        scheduleId: existingSchedule.id,
        origin: '/audit?entity=report-schedule-delivery-alert',
        originLabel: 'Voltar para Auditoria'
      }
    });

    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    expect(reportsService.listScheduleDeliveries).toHaveBeenCalledWith(existingSchedule.id);
    expect(reportsService.listScheduleDeliveryAlerts).toHaveBeenCalledWith(existingSchedule.id);
    expect(wrapper.text()).toContain('Entregas de Executivo diário monitorado');
    expect(wrapper.text()).toContain('Agendamento aberto pela auditoria');
    expect(wrapper.text()).toContain('Executivo diário monitorado');
    expect(wrapper.text()).toContain('Voltar para Auditoria');
    expect(wrapper.text()).toContain('Alertas operacionais');
    expect(wrapper.text()).toContain('financeiro@clinica.com');
  });

  it('reprocesses failed deliveries linked to an operational alert recipient', async () => {
    mockRoute.mockReturnValueOnce({
      query: {
        scheduleId: existingSchedule.id
      }
    });

    const wrapper = mount(ReportsEnginePage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Reprocessar alerta')?.trigger('click');
    await flushPromises();

    expect(reportsService.retryScheduleDelivery).toHaveBeenCalledWith(existingSchedule.id, 'delivery-2');
    expect(reportsService.retryScheduleDelivery).toHaveBeenCalledWith(existingSchedule.id, 'delivery-4');
    expect(reportsService.retryScheduleDelivery).not.toHaveBeenCalledWith(existingSchedule.id, 'delivery-3');
    expect(wrapper.text()).toContain('2 entrega(s) do alerta financeiro@clinica.com reprocessada(s).');
  });
});
