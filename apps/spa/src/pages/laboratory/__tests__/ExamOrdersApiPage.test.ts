import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ExamOrdersApiPage from '../ExamOrdersApiPage.vue';
import { examApiService } from '@/services/examApi';

vi.mock('@/services/examApi', () => ({
  examApiService: {
    listOrders: vi.fn(),
    createOrder: vi.fn()
  }
}));

const orders = [
  {
    id: 'exam_1',
    accountId: 'cliente_1',
    patientId: 'animal_1',
    encounterId: 'enc_1',
    category: 'laboratory',
    examName: 'Hemograma completo',
    examCode: 'HEMO001',
    priority: 'normal',
    status: 'requested',
    notes: null,
    requestedAt: '2026-04-24T08:30:00.000Z',
    completedAt: null,
    createdAt: '2026-04-24T08:30:00.000Z',
    updatedAt: '2026-04-24T08:30:00.000Z'
  },
  {
    id: 'exam_2',
    accountId: 'cliente_2',
    patientId: 'animal_2',
    encounterId: 'enc_2',
    category: 'laboratory',
    examName: 'Urina tipo 1',
    examCode: 'URI001',
    priority: 'urgent',
    status: 'collected',
    notes: null,
    requestedAt: '2026-04-24T09:30:00.000Z',
    completedAt: null,
    createdAt: '2026-04-24T09:30:00.000Z',
    updatedAt: '2026-04-24T09:30:00.000Z'
  }
] as never;

describe('ExamOrdersApiPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/exam-orders');
    vi.mocked(examApiService.listOrders).mockResolvedValue(orders);
  });

  it('renders the Vetus-like exam workflow using the existing exam-orders contract', async () => {
    const wrapper = mount(ExamOrdersApiPage);
    await flushPromises();

    expect(examApiService.listOrders).toHaveBeenCalledWith(undefined);
    expect(wrapper.text()).toContain('Esteira de Exames');
    expect(wrapper.text()).toContain('Atendimento > Atendimentos > Esteira de Exames');
    expect(wrapper.text()).toContain('solicitação, coleta, análise, laudo e entrega');
    expect(wrapper.text()).toContain('Filtrar por...');
    expect(wrapper.text()).toContain('Solicitado');
    expect(wrapper.text()).toContain('Coletado');
    expect(wrapper.text()).toContain('Em Análise');
    expect(wrapper.text()).toContain('Laudado');
    expect(wrapper.text()).toContain('Entregue');
    expect(wrapper.text()).toContain('Hemograma completo');
    expect(wrapper.text()).toContain('Registrar coleta');
    expect(wrapper.text()).toContain('Registrar resultado');
  });

  it('preserves encounter, patient and owner context when opening a new diagnostic order', async () => {
    window.history.replaceState({}, '', '/exam-orders?encounterId=enc_ctx&patientId=pat_ctx&ownerId=owner_ctx');

    const wrapper = mount(ExamOrdersApiPage);
    await flushPromises();

    expect(examApiService.listOrders).toHaveBeenCalledWith('enc_ctx');
    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'));
    expect(hrefs).toContain('/diagnostics?encounterId=enc_ctx&patientId=pat_ctx&ownerId=owner_ctx');
  });

  it('keeps the page usable when the exam order API returns an error', async () => {
    vi.mocked(examApiService.listOrders).mockRejectedValue(new Error('Unexpected error'));

    const wrapper = mount(ExamOrdersApiPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Esteira de Exames');
    expect(wrapper.text()).toContain('Unexpected error');
    expect(wrapper.text()).toContain('Nenhum exame nesta esteira');
  });
});
