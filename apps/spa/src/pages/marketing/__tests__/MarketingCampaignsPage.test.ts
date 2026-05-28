import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MarketingCampaignsPage from '../MarketingCampaignsPage.vue';
import { marketingService } from '@/services/marketing';

vi.mock('@/services/marketing', () => ({
  marketingService: {
    listSegments: vi.fn(),
    createSegment: vi.fn(),
    listTemplates: vi.fn(),
    createTemplate: vi.fn(),
    listCampaigns: vi.fn(),
    createCampaign: vi.fn(),
    scheduleCampaign: vi.fn()
  }
}));

const segment = {
  id: 'segment-1',
  accountId: 'account-1',
  name: 'VIP caninos',
  criteria: { ownerGroups: ['VIP'], consentPurpose: 'marketing', patientSpecies: ['Canina'] },
  createdByUserId: 'user-1',
  createdAt: '2026-05-28T10:00:00.000Z',
  updatedAt: '2026-05-28T10:00:00.000Z'
} as const;

const template = {
  id: 'template-1',
  accountId: 'account-1',
  name: 'Vacina SMS',
  channel: 'sms',
  subject: 'Vacina',
  body: 'Ola {{ownerName}}',
  createdByUserId: 'user-1',
  createdAt: '2026-05-28T10:00:00.000Z',
  updatedAt: '2026-05-28T10:00:00.000Z'
} as const;

const campaign = {
  id: 'campaign-1',
  accountId: 'account-1',
  name: 'Campanha vacina',
  channel: 'sms',
  status: 'draft',
  segmentId: segment.id,
  templateId: template.id,
  scheduledAt: '2026-05-30T12:00:00.000Z',
  estimatedAudience: 12,
  createdByUserId: 'user-1',
  createdAt: '2026-05-28T10:00:00.000Z',
  updatedAt: '2026-05-28T10:00:00.000Z'
} as const;

describe('MarketingCampaignsPage', () => {
  beforeEach(() => {
    vi.mocked(marketingService.listSegments).mockResolvedValue([segment]);
    vi.mocked(marketingService.listTemplates).mockResolvedValue([template]);
    vi.mocked(marketingService.listCampaigns).mockResolvedValue([campaign]);
    vi.mocked(marketingService.createSegment).mockResolvedValue(segment);
    vi.mocked(marketingService.createTemplate).mockResolvedValue(template);
    vi.mocked(marketingService.createCampaign).mockResolvedValue(campaign);
    vi.mocked(marketingService.scheduleCampaign).mockResolvedValue({ ...campaign, status: 'scheduled' });
  });

  it('loads marketing campaigns, segments and templates', async () => {
    const wrapper = mount(MarketingCampaignsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Campanhas de Marketing');
    expect(wrapper.text()).toContain('VIP caninos');
    expect(wrapper.text()).toContain('Vacina SMS');
    expect(wrapper.text()).toContain('Campanha vacina');
    expect(wrapper.text()).toContain('12');
  });

  it('creates and schedules a campaign', async () => {
    const wrapper = mount(MarketingCampaignsPage);
    await flushPromises();

    await wrapper.get('#campaign-name').setValue('Campanha retorno');
    await wrapper.get('#campaign-segment').setValue(segment.id);
    await wrapper.get('#campaign-template').setValue(template.id);
    await wrapper.findAll('button').find((button) => button.text() === 'Criar campanha')?.trigger('click');
    await flushPromises();

    expect(marketingService.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Campanha retorno',
        channel: 'sms',
        segmentId: segment.id,
        templateId: template.id
      })
    );

    await wrapper.findAll('button').find((button) => button.text() === 'Agendar')?.trigger('click');
    await flushPromises();

    expect(marketingService.scheduleCampaign).toHaveBeenCalledWith(campaign.id);
  });

  it('creates segment and template drafts', async () => {
    const wrapper = mount(MarketingCampaignsPage);
    await flushPromises();

    await wrapper.get('#segment-name').setValue('Aniversariantes');
    await wrapper.findAll('button').find((button) => button.text() === 'Criar segmento')?.trigger('click');
    await flushPromises();

    expect(marketingService.createSegment).toHaveBeenCalledWith({
      name: 'Aniversariantes',
      criteria: {
        ownerGroups: ['VIP'],
        patientSpecies: ['Canina'],
        consentPurpose: 'marketing'
      }
    });

    await wrapper.get('#template-name').setValue('Template retorno');
    await wrapper.findAll('button').find((button) => button.text() === 'Criar template')?.trigger('click');
    await flushPromises();

    expect(marketingService.createTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Template retorno',
        channel: 'sms'
      })
    );
  });
});
