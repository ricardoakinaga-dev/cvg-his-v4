import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const mockEncounterList = vi.fn();
const mockTimeline = vi.fn();
const mockRecord = vi.fn();
const mockDiagnosticsList = vi.fn();
const mockDiagnosticsCreate = vi.fn();
const mockAttachmentsList = vi.fn();
const mockAttachmentsUpload = vi.fn();
const mockLaboratoryListOrders = vi.fn();
const mockLaboratoryListReportTypes = vi.fn();
const mockLaboratoryCreateOrder = vi.fn();
const mockLaboratoryRecordResult = vi.fn();

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: (...args: unknown[]) => mockEncounterList(...args)
  }
}));

vi.mock('@/services/medicalRecords', () => ({
  medicalRecordsService: {
    getByEncounter: (...args: unknown[]) => mockRecord(...args),
    getTimeline: (...args: unknown[]) => mockTimeline(...args)
  }
}));

vi.mock('@/services/diagnostics', () => ({
  diagnosticsService: {
    listByEncounter: (...args: unknown[]) => mockDiagnosticsList(...args),
    createRequest: (...args: unknown[]) => mockDiagnosticsCreate(...args),
    listAttachments: (...args: unknown[]) => mockAttachmentsList(...args),
    uploadAttachment: (...args: unknown[]) => mockAttachmentsUpload(...args)
  }
}));

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listOrders: (...args: unknown[]) => mockLaboratoryListOrders(...args),
    listReportTypes: (...args: unknown[]) => mockLaboratoryListReportTypes(...args),
    createOrder: (...args: unknown[]) => mockLaboratoryCreateOrder(...args),
    recordResult: (...args: unknown[]) => mockLaboratoryRecordResult(...args)
  }
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const encounterPair = [
  { id: 'enc-A', patientId: 'pat-A', reason: 'Paciente A', status: 'in_care' },
  { id: 'enc-B', patientId: 'pat-B', reason: 'Paciente B', status: 'in_care' }
];
function note(id: string) { return { id: `note-${id}`, title: `Nota ${id}`, content: `Achados ${id}`, createdAt: '2026-04-10T00:00:00Z' }; }
async function mountPage() { return mount((await import('../DiagnosticsPage.vue')).default); }
function expectNoWrites() {
  expect(mockLaboratoryCreateOrder).not.toHaveBeenCalled();
  expect(mockDiagnosticsCreate).not.toHaveBeenCalled();
  expect(mockAttachmentsUpload).not.toHaveBeenCalled();
  expect(mockLaboratoryRecordResult).not.toHaveBeenCalled();
}

describe('DiagnosticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/diagnostics');
    mockEncounterList.mockResolvedValue([
      {
        id: 'enc-1',
        accountId: 'acc-1',
        patientId: 'pat-1',
        ownerId: 'own-1',
        visitType: 'scheduled',
        status: 'in_care',
        origin: 'schedule',
        reason: 'Retorno clínico',
        openedAt: '2026-04-10T00:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockRecord.mockResolvedValue({
      record: {
        id: 'mr-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        status: 'open',
        createdAt: '2026-04-10T00:00:00Z',
        updatedAt: '2026-04-10T00:00:00Z'
      },
      entries: []
    });
    mockTimeline.mockResolvedValue([
      {
        id: 'tl-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        medicalRecordId: 'mr-1',
        eventType: 'diagnostic_requested',
        summary: 'Diagnóstico solicitado',
        actorUserId: 'user-1',
        occurredAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockDiagnosticsList.mockResolvedValue([]);
    mockAttachmentsList.mockResolvedValue([]);
    mockLaboratoryListOrders.mockResolvedValue([
      {
        id: 'ord-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        examType: 'Hemograma',
        examCatalogId: 'cat_001',
        reason: 'Check-up',
        status: 'requested',
        createdAt: '2026-04-10T00:00:00Z',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockLaboratoryListReportTypes.mockResolvedValue([
      {
        id: 'cat_001',
        code: 'HEM',
        name: 'Hemograma',
        category: 'Laboratorial',
        description: 'Exame hematológico completo',
        active: true
      }
    ]);
    mockLaboratoryCreateOrder.mockResolvedValue({
      id: 'ord-2',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Solicitação clínica',
      status: 'requested',
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockLaboratoryRecordResult.mockResolvedValue({
      id: 'ord-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Check-up',
      status: 'resulted',
      resultSummary: 'resultado.pdf',
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockDiagnosticsCreate.mockResolvedValue({
      id: 'entry-1',
      accountId: 'acc-1',
      medicalRecordId: 'mr-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      entryType: 'assessment',
      title: 'Hemograma',
      content: 'Tipo de exame: Hemograma',
      authoredByUserId: 'user-1',
      version: 1,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockAttachmentsUpload.mockResolvedValue({
      id: 'att-1',
      accountId: 'acc-1',
      linkedEntityType: 'medical_record',
      linkedEntityId: 'mr-1',
      category: 'lab',
      fileName: 'resultado.pdf',
      storageKey: 'files/resultado.pdf',
      mimeType: 'application/pdf',
      checksum: 'sha256',
      source: 'upload',
      uploadedByUserId: 'user-1',
      createdAt: '2026-04-10T00:00:00Z'
    });
  });

  it('uses encounter query context without creating a diagnostic request automatically', async () => {
    window.history.pushState(
      {},
      '',
      '/diagnostics?encounterId=enc-2&patientId=pat-2&ownerId=own-2'
    );
    mockEncounterList.mockResolvedValue([
      {
        id: 'enc-1',
        accountId: 'acc-1',
        patientId: 'pat-1',
        ownerId: 'own-1',
        visitType: 'scheduled',
        status: 'in_care',
        origin: 'schedule',
        reason: 'Retorno clínico',
        openedAt: '2026-04-10T00:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T00:00:00Z'
      },
      {
        id: 'enc-2',
        accountId: 'acc-1',
        patientId: 'pat-2',
        ownerId: 'own-2',
        visitType: 'walk_in',
        status: 'in_care',
        origin: 'reception',
        reason: 'Exame de controle',
        openedAt: '2026-04-10T01:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T01:00:00Z'
      }
    ]);

    const DiagnosticsPage = (await import('../DiagnosticsPage.vue')).default;
    const wrapper = mount(DiagnosticsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Contexto do atendimento clínico');
    expect(wrapper.text()).toContain('enc-2');
    expect(wrapper.text()).toContain('Exame de controle');
    expect(mockRecord).toHaveBeenCalledWith('enc-2');
    expect(mockLaboratoryCreateOrder).not.toHaveBeenCalled();
    expect(mockDiagnosticsCreate).not.toHaveBeenCalled();
  });

  it('registers a real laboratory order and releases a result attachment', async () => {
    const DiagnosticsPage = (await import('../DiagnosticsPage.vue')).default;
    const wrapper = mount(DiagnosticsPage);
    await flushPromises();

    const selects = wrapper.findAll('select');
    await selects[1].setValue('cat_001');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Solicitação clínica');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockLaboratoryCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        examType: 'Hemograma'
      })
    );
    expect(mockDiagnosticsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        title: expect.any(String)
      })
    );

    const forms = wrapper.findAll('form');
    const inputs = wrapper.findAll('input');
    await inputs[2].setValue('resultado.pdf');
    await inputs[3].setValue('application/pdf');
    await inputs[4].setValue('sha256');
    await forms[1].trigger('submit');
    await flushPromises();

    expect(mockAttachmentsUpload).toHaveBeenCalled();
    expect(mockLaboratoryRecordResult).toHaveBeenCalled();
  });

  it('does not show success when the clinical diagnostic note fails after order creation', async () => {
    mockDiagnosticsCreate.mockRejectedValueOnce(new Error('Prontuário indisponível'));
    const DiagnosticsPage = (await import('../DiagnosticsPage.vue')).default;
    const wrapper = mount(DiagnosticsPage);
    await flushPromises();

    const selects = wrapper.findAll('select');
    await selects[1].setValue('cat_001');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Solicitação clínica');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockLaboratoryCreateOrder).toHaveBeenCalled();
    expect(mockDiagnosticsCreate).toHaveBeenCalled();
    expect(wrapper.find('[variant="success"]').exists()).toBe(false);
    expect(wrapper.find('[variant="warning"]').text()).toContain('Pedido laboratorial registrado');
    expect(wrapper.find('[variant="warning"]').text()).toContain('Prontuário indisponível');
  });
  it('masks the previous encounter records and drafts while a new context is pending', async () => {
    mockEncounterList.mockResolvedValue([
      { id: 'enc-A', patientId: 'pat-A', reason: 'Paciente A', status: 'in_care' },
      { id: 'enc-B', patientId: 'pat-B', reason: 'Paciente B', status: 'in_care' }
    ]);
    mockDiagnosticsList.mockResolvedValue([{ id: 'note-A', title: 'Nota exclusiva A', content: 'Achados A', createdAt: '2026-04-10T00:00:00Z' }]);
    const Page = (await import('../DiagnosticsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    mockDiagnosticsList.mockReturnValueOnce(new Promise(() => {}));
    await wrapper.get('select').setValue('enc-B');
    expect(wrapper.text()).not.toContain('Nota exclusiva A');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(mockLaboratoryCreateOrder).not.toHaveBeenCalled();
  });

  it('resets drafts and ignores late B data after switching back to A', async () => {
    mockEncounterList.mockResolvedValue(encounterPair);
    mockDiagnosticsList.mockResolvedValue([note('A')]);
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.get('textarea').setValue('Justificativa privada A');
    const attachmentInputs = wrapper.findAll('form')[1].findAll('input');
    await attachmentInputs[0].setValue('Laudo privado A');
    await attachmentInputs[3].setValue('Checksum privado A');
    const pendingB = deferred<unknown[]>();
    mockTimeline.mockImplementation((id: string) => id === 'enc-B' ? pendingB.promise : Promise.resolve([]));
    mockDiagnosticsList.mockImplementation(async (id: string) => [note(id)]);
    await wrapper.get('select').setValue('enc-B');
    expect(wrapper.find('form').exists()).toBe(false);
    await wrapper.get('select').setValue('enc-A');
    await flushPromises();
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('');
    expect(wrapper.findAll('form')[1].findAll('input').map((x) => (x.element as HTMLInputElement).value)).not.toContain('Laudo privado A');
    pendingB.resolve([{ id: 'event-B', eventType: 'diagnostic_requested', summary: 'Evento antigo B', occurredAt: '2026-04-10T00:00:00Z' }]);
    await flushPromises();
    expect(wrapper.text()).toContain('Nota enc-A');
    expect(wrapper.text()).not.toContain('Nota enc-B');
    expect(wrapper.text()).not.toContain('Evento antigo B');
    expectNoWrites();
  });

  it('allows blank selection during a pending read and ignores its later rejection', async () => {
    mockEncounterList.mockResolvedValue(encounterPair);
    const wrapper = await mountPage();
    await flushPromises();
    const pendingB = deferred<unknown[]>();
    mockTimeline.mockReturnValueOnce(pendingB.promise);
    await wrapper.get('select').setValue('enc-B');
    await wrapper.get('select').setValue('');
    pendingB.reject(new Error('Erro antigo B'));
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Erro antigo B');
    expect(wrapper.text()).toContain('Selecione um atendimento para consultar');
    expect(wrapper.find('a[href="/encounters"]').exists()).toBe(true);
    expectNoWrites();
  });

  it('keeps a timeline failure distinct from empty records and retries after alert dismissal', async () => {
    mockTimeline.mockRejectedValueOnce(new Error('Timeline indisponível'));
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Nenhum pedido laboratorial');
    expect(wrapper.findAll('.overview-metric dd').slice(1).map((x) => x.text())).toEqual(['—', '—', '—']);
    wrapper.findComponent(DsAlert).vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Timeline indisponível');
    expect(wrapper.text()).toContain('Não foi possível carregar os dados diagnósticos');
    await wrapper.get('.context-state button').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('form')).toHaveLength(2);
    expectNoWrites();
  });

  it('shows loading then catalog failure then closed-only empty as distinct states', async () => {
    const catalog = deferred<unknown[]>();
    mockLaboratoryListReportTypes.mockReturnValueOnce(catalog.promise);
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.findAll('.overview-metric dd').map((x) => x.text())).toEqual(['—', '—', '—', '—']);
    expect(wrapper.find('form').exists()).toBe(false);
    catalog.reject(new Error('Catálogo indisponível'));
    await flushPromises();
    wrapper.findComponent(DsAlert).vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.text()).toContain('Não foi possível carregar os atendimentos e tipos de exame');
    mockEncounterList.mockResolvedValueOnce([{ ...encounterPair[0], status: 'closed' }]);
    await wrapper.get('.context-state button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum atendimento aberto disponível');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.findAll('.overview-metric dd').map((x) => x.text())).toEqual(['0', '—', '—', '—']);
    expect(mockRecord).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('opens an explicitly linked closed encounter as read only', async () => {
    window.history.pushState({}, '', '/diagnostics?encounter=enc-B');
    mockEncounterList.mockResolvedValue([encounterPair[0], { ...encounterPair[1], status: 'closed' }]);
    const wrapper = await mountPage();
    await flushPromises();
    expect(mockRecord).toHaveBeenCalledWith('enc-B');
    expect(mockRecord).not.toHaveBeenCalledWith('enc-A');
    expect(wrapper.text()).toContain('somente leitura');
    expect(wrapper.find('form').exists()).toBe(false);
    const vm = wrapper.vm as unknown as { submitRequest: () => Promise<void>; submitAttachment: () => Promise<void> };
    await vm.submitRequest();
    await vm.submitAttachment();
    expectNoWrites();
  });

  it.each(['encounter=missing', 'encounter=missing&patientId=pat-B', 'patientId=missing', 'encounter=enc-B&patientId=pat-A'])(
    'does not substitute unrelated context for %s', async (query) => {
      window.history.pushState({}, '', `/diagnostics?${query}`);
      mockEncounterList.mockResolvedValue(encounterPair);
      const wrapper = await mountPage();
      await flushPromises();
      expect(mockRecord).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('Contexto solicitado indisponível');
      expect(wrapper.find('form').exists()).toBe(false);
      expectNoWrites();
    }
  );

  it('updates same-route query selection and ignores late data from the previous encounter', async () => {
    const Page = (await import('../DiagnosticsPage.vue')).default;
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnostics', component: Page }] });
    await router.push('/diagnostics?encounter=enc-A');
    mockEncounterList.mockResolvedValue([encounterPair[0], { ...encounterPair[1], status: 'closed' }]);
    const pendingA = deferred<unknown[]>();
    mockDiagnosticsList.mockImplementation((id: string) => id === 'enc-A' ? pendingA.promise : Promise.resolve([note('B')]));
    const wrapper = mount(Page, { global: { plugins: [router] } });
    await flushPromises();
    await router.push('/diagnostics?encounter=enc-B');
    await flushPromises();
    expect(mockRecord).toHaveBeenLastCalledWith('enc-B');
    expect(wrapper.text()).toContain('Nota B');
    expect(wrapper.find('form').exists()).toBe(false);
    pendingA.resolve([note('A')]);
    await flushPromises();
    expect(wrapper.text()).not.toContain('Nota A');
    await router.push('/diagnostics?encounter=missing');
    await flushPromises();
    expect(wrapper.text()).toContain('Contexto solicitado indisponível');
    expect(wrapper.text()).not.toContain('Nota B');
    expectNoWrites();
    wrapper.unmount();
  });

  it('ignores a superseded encounter-list response after a query change', async () => {
    const Page = (await import('../DiagnosticsPage.vue')).default;
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnostics', component: Page }] });
    await router.push('/diagnostics?encounter=enc-A');
    const pendingList = deferred<unknown[]>();
    mockEncounterList.mockReturnValueOnce(pendingList.promise).mockResolvedValue(encounterPair);
    const wrapper = mount(Page, { global: { plugins: [router] } });
    await flushPromises();
    await router.push('/diagnostics?encounter=enc-B');
    await flushPromises();
    expect(mockRecord).toHaveBeenCalledWith('enc-B');
    pendingList.resolve([encounterPair[0]]);
    await flushPromises();
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('enc-B');
    expect(mockRecord).not.toHaveBeenCalledWith('enc-A');
    expectNoWrites();
    wrapper.unmount();
  });

  it('preserves patient selection and does not fall back after it disappears on refresh', async () => {
    window.history.pushState({}, '', '/diagnostics?patientId=pat-B');
    mockEncounterList.mockResolvedValue(encounterPair);
    const wrapper = await mountPage();
    await flushPromises();
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('enc-B');
    mockRecord.mockClear();
    mockEncounterList.mockResolvedValueOnce([encounterPair[0]]);
    await wrapper.findAll('button').find((x) => x.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('');
    expect(mockRecord).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('keeps the diagnostic-note payload bound to the request snapshot when the active context changes during creation', async () => {
    mockEncounterList.mockResolvedValue(encounterPair);
    const wrapper = await mountPage();
    await flushPromises();
    const pendingCreate = deferred<unknown>();
    mockLaboratoryCreateOrder.mockReturnValueOnce(pendingCreate.promise);
    await wrapper.get('textarea').setValue('Justificativa A');
    await wrapper.findAll('input')[0].setValue('Título A');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('select').attributes('disabled')).toBeDefined();
    const refresh = wrapper.findAll('button').find(button => button.text() === 'Atualizar')!;
    expect(refresh.attributes('disabled')).toBeDefined();
    const readsBefore = mockEncounterList.mock.calls.length;
    await (wrapper.vm as unknown as { loadData: () => Promise<void> }).loadData();
    expect(mockEncounterList).toHaveBeenCalledTimes(readsBefore);
    // Simulate context invalidation despite the UI lock, e.g. external context change.
    (wrapper.vm as unknown as { selectedEncounterId: string }).selectedEncounterId = 'enc-B';
    await flushPromises();
    pendingCreate.resolve({ id: 'order-A' });
    await flushPromises();
    expect(mockDiagnosticsCreate).toHaveBeenCalledWith({
      encounterId: 'enc-A', patientId: 'pat-A', title: 'Título A',
      content: 'Tipo de exame: Hemograma (HEM)\nJustificativa: Justificativa A'
    });
    expect(wrapper.text()).not.toContain('Pedido laboratorial registrado e vinculado ao prontuário.');
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('enc-B');
  });

  it('keeps the original linked order and result summary through an in-flight attachment upload', async () => {
    mockEncounterList.mockResolvedValue(encounterPair);
    const wrapper = await mountPage();
    await flushPromises();
    const linkedId = (wrapper.findAll('select')[2].element as HTMLSelectElement).value;
    const pendingUpload = deferred<unknown>();
    mockAttachmentsUpload.mockReturnValueOnce(pendingUpload.promise);
    await wrapper.findAll('form')[1].findAll('input')[0].setValue('Resultado do paciente A');
    await wrapper.findAll('form')[1].trigger('submit');
    const refresh = wrapper.findAll('button').find(button => button.text() === 'Atualizar')!;
    expect(refresh.attributes('disabled')).toBeDefined();
    const readsBefore = mockEncounterList.mock.calls.length;
    await (wrapper.vm as unknown as { loadData: () => Promise<void> }).loadData();
    expect(mockEncounterList).toHaveBeenCalledTimes(readsBefore);
    (wrapper.vm as unknown as { selectedEncounterId: string }).selectedEncounterId = 'enc-B';
    await flushPromises();
    pendingUpload.resolve({ id: 'attachment-A', fileName: 'arquivo-A.pdf' });
    await flushPromises();
    expect(mockAttachmentsUpload.mock.calls[0][0]).toBe('enc-A');
    expect(mockLaboratoryRecordResult).toHaveBeenLastCalledWith(linkedId, {
      status: 'resulted', resultSummary: 'Resultado do paciente A', resultAttachmentId: 'attachment-A'
    });
    expect(wrapper.text()).not.toContain('Resultado anexado ao prontuário e liberado no laboratório.');
  });

});
