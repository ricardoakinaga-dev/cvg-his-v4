import {
  LocalPixPaymentGateway,
  PagarMePaymentGatewayAdapter,
  type PaymentGateway
} from './payment-gateway.js';
import {
  LocalEmailGateway,
  ResendEmailGatewayAdapter,
  type EmailGateway
} from './email-gateway.js';
import {
  LocalSmsGateway,
  TwilioSmsGatewayAdapter,
  type SmsGateway
} from './sms-gateway.js';
import {
  GoogleCalendarGatewayAdapter,
  LocalGoogleCalendarGateway,
  type GoogleCalendarGateway
} from './google-calendar-gateway.js';

const PRODUCTION_LIKE_ENVIRONMENTS = new Set(['production', 'staging', 'prod', 'stage']);

export interface ApiIntegrationOptions {
  readonly environment: string;
  readonly pagarmeApiKey?: string;
  readonly pagarmePixKey?: string;
  readonly pixMockMode?: boolean;
  readonly resendApiKey?: string;
  readonly emailFrom?: string;
  readonly emailMockMode?: boolean;
  readonly smsApiKey?: string;
  readonly smsFrom?: string;
  readonly smsMockMode?: boolean;
  readonly googleCalendarAccessToken?: string;
  readonly googleCalendarCalendarId?: string;
  readonly googleCalendarMockMode?: boolean;
}

export interface ApiIntegrationGateways {
  readonly paymentGateway: PaymentGateway;
  readonly emailGateway: EmailGateway;
  readonly smsGateway: SmsGateway;
  readonly googleCalendarGateway: GoogleCalendarGateway;
  readonly paymentProvider: string;
  readonly emailProvider: string;
  readonly smsProvider: string;
  readonly googleCalendarProvider: string;
  readonly googleCalendarConfigured: boolean;
}

export class IntegrationConfigurationError extends Error {
  readonly code = 'INTEGRATION_CONFIGURATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'IntegrationConfigurationError';
  }
}

function hasValue(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

function isProductionLike(environment: string): boolean {
  return PRODUCTION_LIKE_ENVIRONMENTS.has(environment.trim().toLowerCase());
}

function addProviderError(
  errors: string[],
  input: {
    readonly provider: string;
    readonly mockMode: boolean;
    readonly credentials: readonly [string, boolean][];
    readonly productionLike: boolean;
  }
): void {
  if (input.productionLike && input.mockMode) {
    errors.push(`${input.provider} mock mode is forbidden in production-like environments`);
    return;
  }

  if (!input.mockMode) {
    const missing = input.credentials.filter(([, configured]) => !configured).map(([name]) => name);
    if (missing.length > 0) {
      errors.push(`${input.provider} provider is not configured; missing ${missing.join(', ')}`);
    }
  }
}

export function createIntegrationGateways(options: ApiIntegrationOptions): ApiIntegrationGateways {
  const productionLike = isProductionLike(options.environment);
  const pixMockMode = options.pixMockMode === true;
  const emailMockMode = options.emailMockMode === true;
  const smsMockMode = options.smsMockMode === true;
  const googleCalendarMockMode = options.googleCalendarMockMode === true;
  const errors: string[] = [];

  addProviderError(errors, {
    provider: 'PagarMe PIX',
    mockMode: pixMockMode,
    credentials: [
      ['PAGARME_API_KEY', hasValue(options.pagarmeApiKey)],
      ['PAGARME_PIX_KEY', hasValue(options.pagarmePixKey)]
    ],
    productionLike
  });
  addProviderError(errors, {
    provider: 'Resend email',
    mockMode: emailMockMode,
    credentials: [['RESEND_API_KEY', hasValue(options.resendApiKey)]],
    productionLike
  });
  addProviderError(errors, {
    provider: 'Twilio SMS',
    mockMode: smsMockMode,
    credentials: [['SMS_API_KEY', hasValue(options.smsApiKey)]],
    productionLike
  });
  addProviderError(errors, {
    provider: 'Google Calendar',
    mockMode: googleCalendarMockMode,
    credentials: [
      ['GOOGLE_CALENDAR_ACCESS_TOKEN', hasValue(options.googleCalendarAccessToken)],
      ['GOOGLE_CALENDAR_CALENDAR_ID', hasValue(options.googleCalendarCalendarId)]
    ],
    productionLike
  });

  if (errors.length > 0) {
    throw new IntegrationConfigurationError(errors.join('; '));
  }

  const paymentGateway = pixMockMode
    ? new LocalPixPaymentGateway()
    : new PagarMePaymentGatewayAdapter({
        apiKey: options.pagarmeApiKey!,
        pixKey: options.pagarmePixKey!
      });
  const emailGateway = emailMockMode
    ? new LocalEmailGateway()
    : new ResendEmailGatewayAdapter({
        apiKey: options.resendApiKey!,
        from: options.emailFrom ?? 'noreply@cvg-his.local'
      });
  const smsGateway = smsMockMode
    ? new LocalSmsGateway()
    : new TwilioSmsGatewayAdapter({
        apiKey: options.smsApiKey!,
        from: options.smsFrom ?? 'CVGHIS'
      });
  const googleCalendarGateway = googleCalendarMockMode
    ? new LocalGoogleCalendarGateway()
    : new GoogleCalendarGatewayAdapter({
        accessToken: options.googleCalendarAccessToken!,
        calendarId: options.googleCalendarCalendarId!
      });

  return {
    paymentGateway,
    emailGateway,
    smsGateway,
    googleCalendarGateway,
    paymentProvider: paymentGateway.paymentProviders.pix,
    emailProvider: emailGateway.providerName,
    smsProvider: smsGateway.providerName,
    googleCalendarProvider: googleCalendarGateway.providerName,
    googleCalendarConfigured: !googleCalendarMockMode
  };
}

