import type { ReportDeliveryProvider, ReportExportSummary } from '@cvg-his-v2/module-reports';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 15_000;
const CONTROLLED_ENDPOINT_ENVIRONMENTS = new Set(['test', 'development']);

export function createWorkerReportDeliveryProvider(
  environment = process.env.NODE_ENV ?? 'development'
): ReportDeliveryProvider | undefined {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const normalizedEnvironment = environment.trim().toLowerCase();

  if (!apiKey || !from || process.env.EMAIL_MOCK_MODE === 'true') {
    return undefined;
  }

  if (apiKey.length > 512 || from.length > 320 || /[\r\n]/.test(from)) {
    throw new Error('Worker report email configuration is invalid');
  }

  const endpoint = resolveReportEndpoint(normalizedEnvironment);
  return new ResendReportDeliveryProvider({
    apiKey,
    from,
    environment: normalizedEnvironment,
    endpoint
  });
}

function resolveReportEndpoint(environment: string): string {
  const configuredEndpoint = process.env.REPORT_EMAIL_ENDPOINT?.trim();
  if (!configuredEndpoint) return RESEND_ENDPOINT;
  if (!CONTROLLED_ENDPOINT_ENVIRONMENTS.has(environment)) {
    throw new Error('REPORT_EMAIL_ENDPOINT is restricted to test and development environments');
  }
  if (configuredEndpoint.length > 2048) {
    throw new Error('REPORT_EMAIL_ENDPOINT is invalid');
  }

  let parsed: URL;
  try {
    parsed = new URL(configuredEndpoint);
  } catch {
    throw new Error('REPORT_EMAIL_ENDPOINT is invalid');
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('REPORT_EMAIL_ENDPOINT is invalid');
  }
  return parsed.toString();
}

export class ResendReportDeliveryProvider implements ReportDeliveryProvider {
  readonly #apiKey: string;
  readonly #from: string;
  readonly #environment: string;
  readonly #endpoint: string;

  public constructor(input: {
    readonly apiKey: string;
    readonly from: string;
    readonly environment?: string;
    readonly endpoint?: string;
  }) {
    this.#apiKey = input.apiKey;
    this.#from = input.from;
    this.#environment = input.environment?.trim().toLowerCase() || 'production';
    this.#endpoint = input.endpoint ?? RESEND_ENDPOINT;
  }

  public async deliver(input: Parameters<ReportDeliveryProvider['deliver']>[0]): Promise<void> {
    const exported = input.exported;
    const content = attachmentContent(exported);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.#endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': input.idempotencyKey
        },
        body: JSON.stringify({
          from: this.#from,
          to: [input.recipient],
          subject: `Relatório ${exported.filename}`,
          text: `Relatório ${exported.filename} gerado em ${exported.exportedAt}.`,
          attachments: [
            {
              filename: exported.filename,
              content
            }
          ],
          tags: [
            { name: 'cvg-environment', value: this.#environment },
            { name: 'cvg-delivery-id', value: input.deliveryId }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Report email provider rejected delivery (HTTP ${response.status})`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Report email provider rejected')) {
        throw error;
      }
      throw new Error('Report email provider request failed');
    } finally {
      clearTimeout(timeout);
    }
  }
}

function attachmentContent(exported: ReportExportSummary): string {
  if (exported.contentEncoding === 'base64') {
    return exported.content;
  }

  return Buffer.from(exported.content, 'utf8').toString('base64');
}
