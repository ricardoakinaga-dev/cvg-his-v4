// =====================
// Provider Interfaces
// =====================

export interface NotificationProvider {
  name: string;
  channel: 'sms' | 'whatsapp' | 'email';
  send(message: NotificationMessage): Promise<NotificationResult>;
}

export interface NotificationMessage {
  to: string;
  subject?: string;
  body: string;
  bodyHtml?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  providerId?: string; // ID do provedor (SID do Twilio, etc.)
  error?: string;
  metadata?: Record<string, unknown>;
}

// =====================
// SMS Providers
// =====================

export class TwilioSmsProvider implements NotificationProvider {
  name = 'twilio-sms';
  channel = 'sms' as const;

  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string
  ) {}

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      // TODO: Implementar chamada real para Twilio
      // const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
      //     'Content-Type': 'application/x-www-form-urlencoded'
      //   },
      //   body: new URLSearchParams({
      //     To: message.to,
      //     From: this.fromNumber,
      //     Body: message.body
      //   })
      // });

      console.log(`[Twilio SMS] Sending to ${message.to}: ${message.body}`);
      
      return {
        success: true,
        providerId: `twilio_${Date.now()}`,
        metadata: { provider: 'twilio', channel: 'sms' }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { provider: 'twilio', channel: 'sms' }
      };
    }
  }
}

export class ZenviaSmsProvider implements NotificationProvider {
  name = 'zenvia-sms';
  channel = 'sms' as const;

  constructor(
    private apiToken: string,
    private fromNumber: string
  ) {}

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      // TODO: Implementar chamada real para Zenvia
      console.log(`[Zenvia SMS] Sending to ${message.to}: ${message.body}`);
      
      return {
        success: true,
        providerId: `zenvia_${Date.now()}`,
        metadata: { provider: 'zenvia', channel: 'sms' }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { provider: 'zenvia', channel: 'sms' }
      };
    }
  }
}

// =====================
// WhatsApp Providers
// =====================

export class TwilioWhatsAppProvider implements NotificationProvider {
  name = 'twilio-whatsapp';
  channel = 'whatsapp' as const;

  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string
  ) {}

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      // TODO: Implementar chamada real para Twilio WhatsApp
      console.log(`[Twilio WhatsApp] Sending to ${message.to}: ${message.body}`);
      
      return {
        success: true,
        providerId: `twilio_wa_${Date.now()}`,
        metadata: { provider: 'twilio', channel: 'whatsapp' }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { provider: 'twilio', channel: 'whatsapp' }
      };
    }
  }
}

export class Dialog360Provider implements NotificationProvider {
  name = '360dialog-whatsapp';
  channel = 'whatsapp' as const;

  constructor(
    private apiKey: string,
    private fromNumber: string
  ) {}

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      // TODO: Implementar chamada real para 360Dialog
      console.log(`[360Dialog WhatsApp] Sending to ${message.to}: ${message.body}`);
      
      return {
        success: true,
        providerId: `360dialog_${Date.now()}`,
        metadata: { provider: '360dialog', channel: 'whatsapp' }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { provider: '360dialog', channel: 'whatsapp' }
      };
    }
  }
}

// =====================
// Email Providers
// =====================

export class SendGridProvider implements NotificationProvider {
  name = 'sendgrid-email';
  channel = 'email' as const;

  constructor(
    private apiKey: string,
    private fromEmail: string,
    private fromName: string
  ) {}

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      // TODO: Implementar chamada real para SendGrid
      console.log(`[SendGrid Email] Sending to ${message.to}: ${message.subject || 'No subject'}`);
      
      return {
        success: true,
        providerId: `sendgrid_${Date.now()}`,
        metadata: { provider: 'sendgrid', channel: 'email' }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { provider: 'sendgrid', channel: 'email' }
      };
    }
  }
}

export class MailgunProvider implements NotificationProvider {
  name = 'mailgun-email';
  channel = 'email' as const;

  constructor(
    private apiKey: string,
    private domain: string,
    private fromEmail: string,
    private fromName: string
  ) {}

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      // TODO: Implementar chamada real para Mailgun
      console.log(`[Mailgun Email] Sending to ${message.to}: ${message.subject || 'No subject'}`);
      
      return {
        success: true,
        providerId: `mailgun_${Date.now()}`,
        metadata: { provider: 'mailgun', channel: 'email' }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { provider: 'mailgun', channel: 'email' }
      };
    }
  }
}

// =====================
// Provider Factory
// =====================

export function createSmsProvider(
  provider: string,
  config: { apiKey: string; fromNumber: string; accountSid?: string; authToken?: string }
): NotificationProvider {
  switch (provider) {
    case 'twilio':
      if (!config.accountSid || !config.authToken) {
        throw new Error('Twilio requires accountSid and authToken');
      }
      return new TwilioSmsProvider(config.accountSid, config.authToken, config.fromNumber);
    
    case 'zenvia':
      return new ZenviaSmsProvider(config.apiKey, config.fromNumber);
    
    default:
      throw new Error(`Unknown SMS provider: ${provider}`);
  }
}

export function createWhatsAppProvider(
  provider: string,
  config: { apiKey: string; fromNumber: string; accountSid?: string; authToken?: string }
): NotificationProvider {
  switch (provider) {
    case 'twilio':
      if (!config.accountSid || !config.authToken) {
        throw new Error('Twilio requires accountSid and authToken');
      }
      return new TwilioWhatsAppProvider(config.accountSid, config.authToken, config.fromNumber);
    
    case '360dialog':
      return new Dialog360Provider(config.apiKey, config.fromNumber);
    
    default:
      throw new Error(`Unknown WhatsApp provider: ${provider}`);
  }
}

export function createEmailProvider(
  provider: string,
  config: { apiKey: string; fromEmail: string; fromName: string; domain?: string }
): NotificationProvider {
  switch (provider) {
    case 'sendgrid':
      return new SendGridProvider(config.apiKey, config.fromEmail, config.fromName);
    
    case 'mailgun':
      if (!config.domain) {
        throw new Error('Mailgun requires domain');
      }
      return new MailgunProvider(config.apiKey, config.domain, config.fromEmail, config.fromName);
    
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }
}
