import type {
  WhatsAppDeliveryResult,
  WhatsAppMessagePayload,
  WhatsAppProvider,
  NotificationChannelConfig
} from './types.js';
import {
  MissingCredentialsError,
  ProviderNotConfiguredError,
  ProviderDeliveryError
} from './types.js';

function interpolateTemplate(body: string, variables: readonly string[]): string {
  let result = body;
  for (const variable of variables) {
    result = result.replace(/\{\{.*?\}\}/, variable);
  }
  return result;
}

export interface TwilioConfig {
  readonly accountSid: string;
  readonly authToken: string;
  readonly fromNumber: string;
}

export class TwilioWhatsAppAdapter implements WhatsAppProvider {
  readonly type = 'twilio' as const;
  readonly #config: TwilioConfig;

  public constructor(config: TwilioConfig) {
    this.#config = config;
  }

  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    if (!this.#config.accountSid || this.#config.accountSid.trim().length === 0) {
      return { valid: false, error: 'TWILIO_ACCOUNT_SID is required' };
    }
    if (!this.#config.authToken || this.#config.authToken.trim().length === 0) {
      return { valid: false, error: 'TWILIO_AUTH_TOKEN is required' };
    }
    if (!this.#config.fromNumber || this.#config.fromNumber.trim().length === 0) {
      return { valid: false, error: 'TWILIO_FROM_NUMBER is required' };
    }
    return { valid: true };
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppDeliveryResult> {
    const validation = await this.validateConfiguration();
    if (!validation.valid) {
      throw new MissingCredentialsError('twilio', validation.error ?? 'unknown');
    }

    if (!payload.recipient || !payload.recipient.trim()) {
      throw new MissingCredentialsError('twilio', 'recipient phone number');
    }

    const messageBody = interpolateTemplate(payload.body, payload.templateVariables);

    const auth = Buffer.from(`${this.#config.accountSid}:${this.#config.authToken}`).toString(
      'base64'
    );

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.#config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: `whatsapp:${payload.recipient.replace(/\D/g, '')}`,
            From: `whatsapp:${this.#config.fromNumber.replace(/\D/g, '')}`,
            Body: messageBody
          }),
          signal: AbortSignal.timeout(10000)
        }
      );

      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new ProviderDeliveryError(
          'twilio',
          String(data['error_code'] ?? 'unknown'),
          String(data['message'] ?? 'Twilio request failed')
        );
      }

      return {
        success: true,
        messageId: String(data['sid'] ?? '')
      };
    } catch (err) {
      if (err instanceof ProviderDeliveryError || err instanceof MissingCredentialsError) {
        throw err;
      }
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }
}

export class NoOpWhatsAppAdapter implements WhatsAppProvider {
  readonly type = 'twilio' as const;
  #enabled: boolean;

  public constructor(enabled = false) {
    this.#enabled = enabled;
  }

  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    if (!this.#enabled) {
      return { valid: false, error: 'WhatsApp provider is disabled (NoOp mode)' };
    }
    return { valid: true };
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppDeliveryResult> {
    if (!this.#enabled) {
      throw new ProviderNotConfiguredError('no-op');
    }

    return {
      success: true,
      messageId: `noop-${Date.now()}`
    };
  }
}

export interface WhatsApp360DialogConfig {
  readonly apiKey: string;
  readonly fromNumber: string;
  readonly webhookUrl?: string;
}

export class WhatsApp360DialogAdapter implements WhatsAppProvider {
  readonly type = '360dialog' as const;
  #config: WhatsApp360DialogConfig;

  public constructor(config: WhatsApp360DialogConfig) {
    this.#config = config;
  }

  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    if (!this.#config.apiKey || this.#config.apiKey.trim().length === 0) {
      return { valid: false, error: '360DIALOG_API_KEY is required' };
    }
    if (!this.#config.fromNumber || this.#config.fromNumber.trim().length === 0) {
      return { valid: false, error: '360DIALOG_FROM_NUMBER is required' };
    }
    return { valid: true };
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppDeliveryResult> {
    const validation = await this.validateConfiguration();
    if (!validation.valid) {
      throw new MissingCredentialsError('360dialog', validation.error ?? 'unknown');
    }

    if (!payload.recipient || !payload.recipient.trim()) {
      throw new MissingCredentialsError('360dialog', 'recipient phone number');
    }

    const messageBody = interpolateTemplate(payload.body, payload.templateVariables);

    try {
      // 360Dialog WhatsApp Business API
      // https://docs.360dialog.com/whatsapp-business-api
      const response = await fetch('https://waba.360dialog.io/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.#config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: payload.recipient.replace(/\D/g, ''),
          type: 'text',
          text: {
            body: messageBody
          }
        }),
        signal: AbortSignal.timeout(10000)
      });

      const data = (await response.json()) as { messages?: Array<{ id?: string }> };

      if (!response.ok) {
        const errors = data as { errors?: Array<{ code?: string; title?: string }> };
        const errorInfo = errors.errors?.[0];
        throw new ProviderDeliveryError(
          '360dialog',
          String(errorInfo?.code ?? response.status),
          String(errorInfo?.title ?? '360dialog API error')
        );
      }

      return {
        success: true,
        messageId: String(data.messages?.[0]?.id ?? '')
      };
    } catch (err) {
      if (err instanceof ProviderDeliveryError || err instanceof MissingCredentialsError) {
        throw err;
      }
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }
}

export function createWhatsAppProvider(config: NotificationChannelConfig): WhatsAppProvider {
  if (!config.enabled) {
    return new NoOpWhatsAppAdapter(false);
  }

  if (config.providerType === 'twilio') {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new MissingCredentialsError('twilio', 'apiKey');
    }
    return new TwilioWhatsAppAdapter({
      accountSid: config.apiKey,
      authToken: config.apiKey,
      fromNumber: config.fromNumber
    });
  }

  if (config.providerType === '360dialog') {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new MissingCredentialsError('360dialog', 'apiKey');
    }
    return new WhatsApp360DialogAdapter({
      apiKey: config.apiKey,
      fromNumber: config.fromNumber
    });
  }

  throw new ProviderNotConfiguredError(config.providerType);
}
