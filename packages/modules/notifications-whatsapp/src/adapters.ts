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
    return new NoOpWhatsAppAdapter(true);
  }

  throw new ProviderNotConfiguredError(config.providerType);
}
