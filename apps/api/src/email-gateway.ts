import { nowIso } from '@cvg-his-v2/shared-utils';

export interface EmailSendInput {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly idempotencyKey?: string;
}

export interface EmailSendResult {
  readonly provider: 'local-email' | 'resend';
  readonly status: 'sent' | 'failed';
  readonly sentAt: string;
  readonly providerMessageId?: string;
  readonly failureReason?: string;
}

export interface EmailGateway {
  readonly providerName: 'local-email' | 'resend';
  send(input: EmailSendInput): Promise<EmailSendResult>;
}

export class LocalEmailGateway implements EmailGateway {
  readonly providerName = 'local-email' as const;

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const sentAt = nowIso();
    if (input.to.toLowerCase().includes('fail')) {
      return {
        provider: this.providerName,
        status: 'failed',
        sentAt,
        failureReason: 'Simulated local email failure'
      };
    }

    return {
      provider: this.providerName,
      status: 'sent',
      sentAt,
      providerMessageId: `local_email_${Buffer.from(`${input.to}|${input.subject}`).toString('base64url')}`
    };
  }
}

export class ResendEmailGatewayAdapter implements EmailGateway {
  readonly providerName = 'resend' as const;
  readonly #apiKey: string;
  readonly #from: string;

  constructor(options: { readonly apiKey: string; readonly from: string }) {
    this.#apiKey = options.apiKey;
    this.#from = options.from;
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const sentAt = nowIso();
    let response: Response;

    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          'Content-Type': 'application/json',
          ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {})
        },
        body: JSON.stringify({
          from: this.#from,
          to: [input.to],
          subject: input.subject,
          text: input.text
        })
      });
    } catch (error) {
      return {
        provider: this.providerName,
        status: 'failed',
        sentAt,
        failureReason:
          error instanceof Error ? error.message : 'Resend send failed before receiving response'
      };
    }

    if (!response.ok) {
      return {
        provider: this.providerName,
        status: 'failed',
        sentAt,
        failureReason: `Resend send failed with status ${response.status}`
      };
    }

    const payload = (await response.json()) as { id?: string };
    return {
      provider: this.providerName,
      status: 'sent',
      sentAt,
      providerMessageId: payload.id
    };
  }
}
