import { spaRuntimeConfig } from '@/config/runtime';

export interface WhatsAppInboundPayload {
  MessageSid: string;
  From: string;
  To?: string;
  Body: string;
  AppointmentId?: string;
}

const API_BASE = spaRuntimeConfig.apiBaseUrl;

export const whatsappService = {
  async sendInbound(payload: WhatsAppInboundPayload): Promise<string> {
    const response = await fetch(`${API_BASE}/api/webhooks/whatsapp/inbound`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }
};
