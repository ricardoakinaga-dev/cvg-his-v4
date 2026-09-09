import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();
const mockAcknowledge = vi.fn();
const mockComplete = vi.fn();
const mockCancel = vi.fn();
const mockReplay = vi.fn();

vi.mock('@/services/workflowTasks', () => ({
  workflowTaskService: {
    list: (...args: unknown[]) => mockList(...args),
    acknowledge: (...args: unknown[]) => mockAcknowledge(...args),
    complete: (...args: unknown[]) => mockComplete(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
    replay: (...args: unknown[]) => mockReplay(...args)
  }
}));

const task = {
  id: 'task-1',
  accountId: 'account-1',
  taskType: 'clinical.follow_up',
  status: 'pending' as const,
  executionMode: 'manual' as const,
  priority: 'high' as const,
  title: 'Retorno clínico registrado na alta',
  description: 'Revisar o retorno clínico previsto na alta.',
  patientId: 'patient-1',
  encounterId: 'encounter-1',
  dueAt: '2099-09-12T09:00:00.000Z',
  idempotencyKey: 'discharge-follow-up:discharge-1',
  metadata: {},
  attempts: 0,
  maxAttempts: 5,
  nextAttemptAt: '2099-09-12T09:00:00.000Z',
  escalationLevel: 0,
  correlationId: 'corr-1',
  createdAt: '2026-09-09T12:00:00.000Z',
  updatedAt: '2026-09-09T12:00:00.000Z'
};

describe('WorkflowTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([task]);
    mockComplete.mockResolvedValue({ ...task, status: 'completed' });
  });

  it('loads a clinical worklist with context and status controls', async () => {
    const Page = (await import('../WorkflowTasksPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();

    expect(wrapper.text()).toContain('Pendências clínicas');
    expect(wrapper.text()).toContain('Retorno clínico registrado na alta');
    expect(wrapper.text()).toContain('Retorno clínico');
    expect(wrapper.find('#workflow-task-status').exists()).toBe(true);
    expect(mockList).toHaveBeenCalledWith({ limit: 200 });
  });

  it('completes a pending task from the operational queue', async () => {
    const Page = (await import('../WorkflowTasksPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();

    const completeButton = wrapper.findAll('button').find((button) => button.text() === 'Concluir');
    expect(completeButton).toBeDefined();
    await completeButton!.trigger('click');
    await flushPromises();

    expect(mockComplete).toHaveBeenCalledWith('task-1');
    expect(wrapper.text()).toContain('Tarefa concluída com sucesso.');
  });
});
