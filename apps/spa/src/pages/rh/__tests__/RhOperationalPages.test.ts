import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommissionCalculationsPage from '../CommissionCalculationsPage.vue';
import CommissionRulesPage from '../CommissionRulesPage.vue';
import RhProfessionsPage from '../RhProfessionsPage.vue';
import TimeOffPage from '../TimeOffPage.vue';
import { administrativeReportsService } from '@/services/administrativeReports';
import { staffService } from '@/services/staff';
import type { AdministrativeReportsResponse } from '@/services/administrativeReports';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

vi.mock('@/services/staff', () => ({
  staffService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/administrativeReports', () => ({
  administrativeReportsService: {
    getHubs: vi.fn()
  }
}));

const staff: StaffSummary[] = [
  {
    id: 'staff-1',
    accountId: 'acc-1',
    userId: 'user-1' as never,
    employeeCode: 'VET-001',
    fullName: 'Ana Paula',
    department: 'Clínica',
    jobTitle: 'Médica Veterinária',
    status: 'active',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z'
  },
  {
    id: 'staff-2',
    accountId: 'acc-1',
    employeeCode: 'LAB-001',
    fullName: 'Rafael Lima',
    department: 'Laboratório',
    jobTitle: 'Bioquímico',
    status: 'active',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z'
  }
] as StaffSummary[];

const report = {
  executive: {
    commercialRevenue: 1200,
    outstandingReceivables: 0,
    pixAttentionCount: 0,
    quotePipelineAmount: 0,
    openCashBalance: 0,
    fiscalCoverageScore: 0
  },
  domains: {
    commercial: {
      counterSales: {
        avgTicket: 300,
        topServices: [{ name: 'Consulta', quantity: 4, revenue: 800 }],
        topProducts: [{ name: 'Medicação', quantity: 2, revenue: 400 }],
        totalSales: 6,
        openCount: 0,
        closedCount: 6,
        cancelledCount: 0,
        grossRevenue: 1200,
        netRevenue: 1200,
        byPaymentMethod: []
      },
      quotes: {
        issuedCount: 0,
        approvedCount: 0,
        convertedCount: 0,
        rejectedCount: 0,
        pipelineAmount: 0,
        convertedAmount: 0,
        recent: []
      }
    },
    financial: {
      billing: {
        totalRecords: 0,
        draftCount: 0,
        estimatedCount: 0,
        openCount: 0,
        settledCount: 0,
        grossAmount: 0
      },
      receivables: {
        openCount: 0,
        currentCount: 0,
        overdueCount: 0,
        totalOutstanding: 0,
        currentAmount: 0,
        overdueAmount: 0,
        topOpenReceivables: []
      },
      pix: {
        totalTransactions: 0,
        completedCount: 0,
        pendingCount: 0,
        expiredCount: 0,
        cancelledCount: 0,
        reconciledCount: 0,
        attentionRequiredCount: 0,
        completedAmount: 0,
        byProvider: []
      }
    },
    cash: {
      hasOpenRegister: false,
      openRegister: null,
      registerCount: 0,
      recentRegisters: [],
      recentMovements: [],
      inflowAmount: 0
    },
    fiscal: {
      activeTaxes: 0,
      cfopCount: 0,
      nfseLayouts: 0,
      icmsRules: 0,
      pisCofinsRules: 0,
      ncmEntries: 0,
      readOnly: false,
      backendScope: '',
      pendingScopes: [],
      alerts: []
    }
  },
  generatedAt: '2026-04-28T00:00:00.000Z',
  filters: { dateFrom: null, dateTo: null },
  highlights: []
} as unknown as AdministrativeReportsResponse;

describe('RH operational pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(staffService.list).mockResolvedValue(staff);
    vi.mocked(administrativeReportsService.getHubs).mockResolvedValue(report);
  });

  it('renders professions from staff job titles', async () => {
    const wrapper = mount(RhProfessionsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Profissões');
    expect(wrapper.text()).toContain('RH');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Cadastros/Profissoes.htm');
    expect(wrapper.text()).toContain('cadastro mestre classificatório');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Profissionais vinculados');
    expect(wrapper.text()).toContain('Médica Veterinária');
    expect(wrapper.text()).toContain('Bioquímico');
    expect(wrapper.text()).toContain('Ana Paula');
    expect(staffService.list).toHaveBeenCalled();
  });

  it('filters professions by description and linked professional', async () => {
    const wrapper = mount(RhProfessionsPage);
    await flushPromises();

    const descriptionInput = wrapper.find('input#profession-description');
    expect(descriptionInput.exists()).toBe(true);
    await descriptionInput.setValue('Bioquímico');

    const linkedInput = wrapper.find('input#profession-linked');
    expect(linkedInput.exists()).toBe(true);
    await linkedInput.setValue('Rafael');

    const searchButton = wrapper.findAll('button').find((button) => button.text() === 'Pesquisar');
    expect(searchButton).toBeTruthy();
    await searchButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Pesquisa preparada para profissões com descrição Bioquímico e vínculo Rafael');
    expect(wrapper.text()).toContain('Bioquímico');
    expect(wrapper.text()).toContain('Rafael Lima');
    expect(wrapper.text()).not.toContain('Médica VeterináriaClínica');
  });

  it('renders commission rules from staff departments and job titles', async () => {
    const wrapper = mount(CommissionRulesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Regras de Comissão');
    expect(wrapper.text()).toContain('RH');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Cadastro de Regras de Comissão');
    expect(wrapper.text()).toContain('Comissoes/RegrasDeComissao.htm');
    expect(wrapper.text()).toContain('rh-regras-comissao-01.png');
    expect(wrapper.text()).toContain('modulos/com-02-regras.png');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Id');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Clínica');
    expect(wrapper.text()).toContain('Médica Veterinária');
  });

  it('filters commission rules by Vetus id and description', async () => {
    const wrapper = mount(CommissionRulesPage);
    await flushPromises();

    const idInput = wrapper.find('input#commission-rule-id');
    expect(idInput.exists()).toBe(true);
    await idInput.setValue('REG-002');

    const descriptionInput = wrapper.find('input#commission-rule-description');
    expect(descriptionInput.exists()).toBe(true);
    await descriptionInput.setValue('Bioquímico');

    const searchButton = wrapper.findAll('button').find((button) => button.text() === 'Pesquisar');
    expect(searchButton).toBeTruthy();
    await searchButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Pesquisa preparada para regras com Id REG-002 e descrição Bioquímico');
    expect(wrapper.text()).toContain('REG-002');
    expect(wrapper.text()).toContain('Bioquímico');
    expect(wrapper.text()).not.toContain('REG-001');
  });

  it('renders commission calculation preview from administrative report data', async () => {
    const wrapper = mount(CommissionCalculationsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Cálculo de Comissões');
    expect(wrapper.text()).toContain('Comissoes/CalculoDeComissoes.htm');
    expect(wrapper.text()).toContain('Profissional');
    expect(wrapper.text()).toContain('Data do Cálculo');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Registros de cálculo');
    expect(wrapper.text()).toContain('Data de Cálculo');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Sem contrato auditável de fechamento');
    expect(wrapper.text()).toContain('Consulta');
    expect(wrapper.text()).toContain('Medicação');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('filters commission calculation search by professional before preparing rows', async () => {
    const wrapper = mount(CommissionCalculationsPage);
    await flushPromises();

    const professionalSelect = wrapper.find('select#commission-professional');
    expect(professionalSelect.exists()).toBe(true);
    await professionalSelect.setValue('staff-2');

    const dateInput = wrapper.find('input#commission-calculation-date');
    expect(dateInput.exists()).toBe(true);
    await dateInput.setValue('2026-04-30');

    const searchButton = wrapper.findAll('button').find((button) => button.text() === 'Pesquisar');
    expect(searchButton).toBeTruthy();
    await searchButton!.trigger('click');

    expect(wrapper.text()).toContain('Pesquisa preparada para Rafael Lima em 30/04/2026');
    expect(wrapper.text()).toContain('Rafael Lima');
    expect(wrapper.text()).not.toContain('Ana Paula 30/04/2026');
  });

  it('renders time off coverage from active staff without fake leave records', async () => {
    const wrapper = mount(TimeOffPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Folgas');
    expect(wrapper.text()).toContain('RH');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Agenda/Folgas.htm');
    expect(wrapper.text()).toContain('rh-folgas-01.png');
    expect(wrapper.text()).toContain('GET /time-off?professionalId=&dateFrom=&dateTo=');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Profissional');
    expect(wrapper.text()).toContain('Data inicial');
    expect(wrapper.text()).toContain('Data final');
    expect(wrapper.text()).toContain('Motivo/Status');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Cobertura por profissional');
    expect(wrapper.text()).toContain('Impacto na agenda');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Ana Paula');
  });

  it('prepares time off search by professional, date range, and reason/status', async () => {
    const wrapper = mount(TimeOffPage);
    await flushPromises();

    const professionalSelect = wrapper.find('select#time-off-professional');
    expect(professionalSelect.exists()).toBe(true);
    await professionalSelect.setValue('staff-2');

    const dateFromInput = wrapper.find('input#time-off-date-from');
    expect(dateFromInput.exists()).toBe(true);
    await dateFromInput.setValue('2026-05-01');

    const dateToInput = wrapper.find('input#time-off-date-to');
    expect(dateToInput.exists()).toBe(true);
    await dateToInput.setValue('2026-05-03');

    const reasonInput = wrapper.find('input#time-off-reason-status');
    expect(reasonInput.exists()).toBe(true);
    await reasonInput.setValue('Férias');

    const searchButton = wrapper.findAll('button').find((button) => button.text() === 'Pesquisar');
    expect(searchButton).toBeTruthy();
    await searchButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Pesquisa preparada para folgas de Rafael Lima entre 01/05/2026 e 03/05/2026 com motivo/status Férias');
    expect(wrapper.text()).toContain('Rafael Lima');
    expect(wrapper.text()).not.toContain('Ana PaulaClínica');
  });
});
