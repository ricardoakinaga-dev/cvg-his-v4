import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExamResultsApiPage from '../ExamResultsApiPage.vue';
import { examApiService } from '@/services/examApi';
import type { ExamResultRecord } from '@/types/examApi';
vi.mock('@/services/examApi', () => ({ examApiService: { listResults: vi.fn(), updateResult: vi.fn() } }));
const record = { id: 'result-1', patientId: 'patient-1', examName: 'Hemograma', status: 'draft', findings: 'Achados existentes', interpretation: 'Interpretação existente' } as ExamResultRecord;
const render = () => mount(ExamResultsApiPage, { global: { stubs: { DsAlert: false, AppPageHeader: { template: '<header><slot name="title"/><slot name="subtitle"/><slot name="actions"/></header>' }, RouterLink: { template: '<a><slot/></a>' } } } });
describe('ExamResultsApiPage recovery and result preservation', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(examApiService.listResults).mockResolvedValue([]); });
  it('keeps unavailable distinct from empty after dismiss, then retries', async () => {
    vi.mocked(examApiService.listResults).mockRejectedValueOnce(new Error('Falha de conexão'));
    const wrapper = render(); await flushPromises();
    expect(wrapper.text()).toContain('Resultados indisponíveis');
    await wrapper.get('[aria-label="Fechar alerta"]').trigger('click');
    expect(wrapper.text()).toContain('Resultados indisponíveis');
    expect(wrapper.text()).not.toContain('Nenhum resultado disponível');
    await wrapper.findAll('button').find(b => b.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum resultado disponível');
    expect(wrapper.text()).toContain('Ver solicitações');
  });
  it('preserves existing findings and interpretation on unchanged release', async () => {
    vi.mocked(examApiService.listResults).mockResolvedValue([record]);
    vi.mocked(examApiService.updateResult).mockResolvedValue({ ...record, status: 'released' });
    const wrapper = render(); await flushPromises();
    await wrapper.findAll('button').find(b => b.text() === 'Liberar')!.trigger('click'); await flushPromises();
    expect(examApiService.updateResult).toHaveBeenCalledWith('result-1', { status: 'released', findings: record.findings, interpretation: record.interpretation });
    expect(wrapper.text()).toContain('Liberado');
  });
  it('submits the edited text and keeps it visible after a failed update', async () => {
    vi.mocked(examApiService.listResults).mockResolvedValue([record]);
    vi.mocked(examApiService.updateResult).mockRejectedValue(new Error('Falha ao salvar'));
    const wrapper = render(); await flushPromises();
    await wrapper.get('textarea').setValue('Revisão clínica');
    await wrapper.findAll('button').find(b => b.text() === 'Liberar')!.trigger('click'); await flushPromises();
    expect(examApiService.updateResult).toHaveBeenCalledWith('result-1', { status: 'released', findings: 'Revisão clínica', interpretation: 'Revisão clínica' });
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Revisão clínica');
    expect(wrapper.text()).toContain('Rascunho');
  });
});
