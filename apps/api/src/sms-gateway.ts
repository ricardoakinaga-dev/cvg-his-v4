import { nowIso } from '@cvg-his-v2/shared-utils';

export interface SmsSendInput {
  readonly to: string;
  readonly text: string;
}

export interface SmsSendResult {
  readonly provider: 'local-sms' | 'twilio';
  readonly status: 'sent' | 'failed';
  readonly sentAt: string;
  readonly providerMessageId?: string;
  readonly failureReason?: string;
}

export interface SmsGateway {
  readonly providerName: 'local-sms' | 'twilio';
  send(input: SmsSendInput): Promise<SmsSendResult>;
}

export class LocalSmsGateway implements SmsGateway {
  readonly providerName = 'local-sms' as const;

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const sentAt = nowIso();
    if (input.to.includes('0000') || input.text.toLowerCase().includes('fail')) {
      return {
        provider: this.providerName,
        status: 'failed',
        sentAt,
        failureReason: 'Simulated local SMS failure'
      };
    }

    return {
      provider: this.providerName,
      status: 'sent',
      sentAt,
      providerMessageId: `local_sms_${Buffer.from(`${input.to}|${input.text}`).toString('base64url')}`
    };
  }
}

export class TwilioSmsGatewayAdapter implements SmsGateway {
  readonly providerName = 'twilio' as const;
  readonly #apiKey: string;
  readonly #from: string;

  public constructor(options: { readonly apiKey: string; readonly from: string }) {
    this.#apiKey = options.apiKey;
    this.#from = options.from;
  }

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const sentAt = nowIso();
    let response: Response;

    try {
      response = await fetch('https://api.twilio.com/2010-04-01/Accounts/messages.json', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          To: input.to,
          From: this.#from,
          Body: input.text
        })
      });
    } catch (error) {
      return {
        provider: this.providerName,
        status: 'failed',
        sentAt,
        failureReason: error instanceof Error ? error.message : 'Twilio send failed before response'
      };
    }

    if (!response.ok) {
      return {
        provider: this.providerName,
        status: 'failed',
        sentAt,
        failureReason: `Twilio send failed with status ${response.status}`
      };
    }

    const payload = (await response.json()) as { sid?: string };
    return {
      provider: this.providerName,
      status: 'sent',
      sentAt,
      providerMessageId: payload.sid
    };
  }
}
