import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { AttachmentSummary } from '@cvg-his-v2/shared-types';
import ClinicalAttachmentsPanel from '../ClinicalAttachmentsPanel.vue';

function attachment(overrides: Record<string, unknown> = {}): AttachmentSummary {
  return {
    id: 'attachment-1',
    accountId: 'account-1',
    linkedEntityType: 'medical_record',
    linkedEntityId: 'record-1',
    category: 'image',
    fileName: 'raio-x.jpg',
    storageKey: 'attachments/raio-x.jpg',
    mimeType: 'image/jpeg',
    checksum: 'checksum',
    sizeBytes: 4096,
    source: 'upload',
    scanStatus: 'available',
    uploadedByUserId: 'user-1',
    createdAt: '2026-09-24T12:00:00Z',
    ...overrides
  } as unknown as AttachmentSummary;
}

function mountPanel(
  props: Partial<{
    attachments: readonly AttachmentSummary[];
    loading: boolean;
    error: string;
    actionError: string;
    openingId: string | null;
    diagnosticsHref: string;
  }> = {}
) {
  return mount(ClinicalAttachmentsPanel, {
    props: {
      attachments: [],
      loading: false,
      error: '',
      actionError: '',
      openingId: null,
      diagnosticsHref: '/diagnostics?encounterId=enc-1',
      ...props
    },
    global: {
      stubs: {
        DsButton: {
          props: ['disabled', 'loading', 'to'],
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
        }
      }
    }
  });
}

describe('ClinicalAttachmentsPanel', () => {
  it('keeps loading separate from an empty attachment result', () => {
    const wrapper = mountPanel({ loading: true });

    expect(
      wrapper.get('[data-testid="clinical-attachments-loading"]').attributes('aria-busy')
    ).toBe('true');
    expect(wrapper.find('[data-testid="clinical-attachments-empty"]').exists()).toBe(false);
  });

  it('shows an unconfirmed state after a failed load instead of claiming the record is empty', () => {
    const wrapper = mountPanel({ error: 'Falha ao carregar anexos' });

    expect(wrapper.get('[data-testid="clinical-attachments-error"]').text()).toContain(
      'Falha ao carregar anexos'
    );
    expect(wrapper.get('[data-testid="clinical-attachments-unconfirmed"]').text()).toContain(
      'não pôde ser confirmada'
    );
    expect(wrapper.find('[data-testid="clinical-attachments-empty"]').exists()).toBe(false);
  });

  it('renders metadata, keeps quarantined files unavailable, and emits only an available file', async () => {
    const available = attachment();
    const quarantined = attachment({
      id: 'attachment-2',
      fileName: 'laudo.pdf',
      scanStatus: 'quarantined'
    });
    const wrapper = mountPanel({ attachments: [available, quarantined] });

    expect(wrapper.get('[data-testid="clinical-attachment-attachment-1"]').text()).toContain(
      'Tamanho: 4 KB'
    );
    expect(wrapper.get('[data-testid="clinical-attachment-attachment-2"]').text()).toContain(
      'Aguardando verificação de segurança'
    );
    expect(wrapper.find('[data-testid="clinical-attachment-open-attachment-2"]').exists()).toBe(
      false
    );

    await wrapper.get('[data-testid="clinical-attachment-open-attachment-1"]').trigger('click');

    expect(wrapper.emitted('open')).toEqual([[available]]);
  });

  it('disables all open actions while a download URL is being prepared', () => {
    const wrapper = mountPanel({ attachments: [attachment()], openingId: 'attachment-1' });

    expect(
      wrapper.get('[data-testid="clinical-attachment-open-attachment-1"]').attributes()
    ).toMatchObject({ disabled: '' });
    expect(wrapper.get('[data-testid="clinical-attachment-open-attachment-1"]').text()).toContain(
      'Preparando'
    );
  });
});
