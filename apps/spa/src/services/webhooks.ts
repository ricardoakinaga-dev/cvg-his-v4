import { webhookService as canonicalWebhookService } from './webhook';

export const webhookService = {
  ...canonicalWebhookService,
  async listDeliveries(id: string) {
    return canonicalWebhookService.getDeliveries(id);
  }
};
