/**
 * NFS-e Emitter Service — CVG-HIS-V2
 *
 * Implements Nota Fiscal de Serviços Eletrônica (NFS-e) emission
 * for Brazilian municipalities via ISS SOAP/Swagger APIs.
 *
 * Supports:
 * - Abrasf/Betha (São Paulo, Porto Alegre, etc.)
 * - ISSSaoPaulo (nota fiscal web)
 * - ISSNet (ABRASF)
 * - Nota Rio
 *
 * In production, replace with official SDK from the municipality
 * or use a facade like Totv's Fiscal or ContaAzul.
 */

import { randomBytes } from 'node:crypto';

export type NfseProvider = 'abrasf' | 'iss_sp' | 'iss_net' | 'nota_rio';

export interface NfseEmitterConfig {
  readonly provider: NfseIssuerConfig;
  readonly issuer: NfseIssuer;
  readonly regime: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
  /** Test/development-only opt-in for the deterministic local simulator. */
  readonly allowSimulation?: boolean;
}

export interface NfseIssuerConfig {
  readonly provider: NfseProvider;
  readonly apiUrl: string;
  readonly apiKey?: string;
  readonly certificate?: Buffer; // PFX/PEM for signed requests
  readonly municipalityCode: string; // IBGE code
}

export interface NfseIssuer {
  readonly cnpj: string;
  readonly inscricaoMunicipal: string;
  readonly razaoSocial: string;
  readonly nomeFantasia?: string;
  readonly address: NfseAddress;
  readonly phone?: string;
  readonly email?: string;
}

export interface NfseAddress {
  readonly street: string;
  readonly number: string;
  readonly complement?: string;
  readonly district: string;
  readonly city: string;
  readonly state: string; // 2-letter UF
  readonly zipCode: string;
  readonly country: string;
}

export interface NfseServiceLine {
  readonly description: string;
  readonly codigoServico: string;   // LC116 CNAE code
  readonly cnae: string;           // CNAE code
  readonly quantity: number;
  readonly unitValue: number;
  readonly totalValue: number;
  readonly issRate: number;        // Alíquota ISS (decimal)
  readonly issValue: number;
  readonly pisValue: number;
  readonly cofinsValue: number;
  readonly csllValue: number;
  readonly irrfValue?: number;
  readonly inssValue?: number;
}

export interface NfseCustomer {
  readonly type: 'cpf' | 'cnpj';
  readonly document: string;
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: NfseAddress;
}

export interface NfseDocument {
  readonly id: string;
  readonly serie: string;
  readonly numero: number;
  readonly competencia: string;    // YYYY-MM-DD
  readonly issuer: NfseIssuer;
  readonly customer: NfseCustomer;
  readonly services: readonly NfseServiceLine[];
  readonly subtotal: number;
  readonly totalIss: number;
  readonly totalPis: number;
  readonly totalCofins: number;
  readonly totalCsll: number;
  readonly totalIrrf?: number;
  readonly totalInss?: number;
  readonly totalDocument: number;
  readonly observations?: string;
  readonly createdAt: string;
  readonly status: 'draft' | 'issued' | 'cancelled' | 'error';
  readonly provider: NfseProvider;
  readonly authorizationCode?: string;
  readonly verificationUrl?: string;
}

/**
 * LC116/2003 Service codes for veterinary and medical services.
 * Used as codigoServico in NFS-e.
 */
export const LC116_SERVICE_CODES = {
  // 1.01 — Assessoria ou consultoria
  '0101': { description: 'Assessoria contábil', cnae: '6920-6/01' },
  '0102': { description: 'Assessoria em gestão empresarial', cnae: '7020-4/99' },

  // 1.04 — Consultoria técnica
  '0104': { description: 'Consultoria técnica em informática', cnae: '6204-0/00' },

  // 1.07 — Procesamento de dados
  '0107': { description: 'Processamento de dados', cnae: '6311-9/00' },

  // 4.01 — Medicina
  '0401': { description: 'Medicina', cnae: '8610-1/01' },
  '0403': { description: 'Laboratório de análises clínicas', cnae: '8640-2/02' },
  '0405': { description: 'Ultrassonografia e diagnóstico por imagem', cnae: '8630-5/03' },
  '0407': { description: 'Veterinária', cnae: '7500-1/00' },

  // 4.05 — Medicine alternative
  '0409': { description: 'Odontologia', cnae: '8630-5/01' },
  '0411': { description: 'Fisioterapia', cnae: '8650-0/99' },

  // 4.06 - Exames e ensaios
  '0413': { description: 'Exames laboratoriais', cnae: '8640-2/02' },

  // 7.02 — Serviços de démonstração
  '0702': { description: 'Treinamento em empresa', cnae: '8599-6/99' },

  // 8.01 — Serviços de asepsia
  '0801': { description: 'Locação de equipamentos médicos', cnae: '7739-0/99' },

  // 9.01 — Serviços de исследования
  '0901': { description: 'Análises e testes técnicos', cnae: '7120-1/00' },

  // 17.01 — Serviços de manutenção
  '1701': { description: 'Manutenção de equipamentos', cnae: '3313-9/00' },

  // 17.08 — Manutenção de equipamentos de escritório
  '1708': { description: 'Suporte técnico em informática', cnae: '6204-0/00' },
} as const;

/**
 * Generate a unique NFS-e document ID.
 */
export function generateNfseId(prefix = 'nfse'): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}

/**
 * Build NFS-e XML payload for Abrasf/Betha format.
 */
export function buildNfseXml(document: NfseDocument): string {
  const lines = document.services.map(svc => `    <Servico>
      <Descricao>${escapeXml(svc.description)}</Descricao>
      <CodigoServico>${escapeXml(svc.codigoServico)}</CodigoServico>
      <Quantidade>${svc.quantity}</Quantidade>
      <ValorUnitario>${svc.unitValue.toFixed(2)}</ValorUnitario>
      <ValorServico>${svc.totalValue.toFixed(2)}</ValorServico>
      <IssRate>${(svc.issRate * 100).toFixed(2)}</IssRate>
      <IssValue>${svc.issValue.toFixed(2)}</IssValue>
      <Pis>${svc.pisValue.toFixed(2)}</Pis>
      <Cofins>${svc.cofinsValue.toFixed(2)}</Cofins>
      <Csll>${svc.csllValue.toFixed(2)}</Csll>
    </Servico>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Nfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <InfNfse>
    <Id>${escapeXml(document.id)}</Id>
    <Serie>${escapeXml(document.serie)}</Serie>
    <Numero>${document.numero}</Numero>
    <Competencia>${escapeXml(document.competencia)}</Competencia>
    <Issuer>
      <CNPJ>${escapeXml(document.issuer.cnpj)}</CNPJ>
      <InscricaoMunicipal>${escapeXml(document.issuer.inscricaoMunicipal)}</InscricaoMunicipal>
      <RazaoSocial>${escapeXml(document.issuer.razaoSocial)}</RazaoSocial>
      <Endereco>
        <Logradouro>${escapeXml(document.issuer.address.street)}</Logradouro>
        <Numero>${escapeXml(document.issuer.address.number)}</Numero>
        <Complemento>${escapeXml(document.issuer.address.complement ?? '')}</Complemento>
        <Bairro>${escapeXml(document.issuer.address.district)}</Bairro>
        <Cidade>${escapeXml(document.issuer.address.city)}</Cidade>
        <UF>${escapeXml(document.issuer.address.state)}</UF>
        <CEP>${escapeXml(document.issuer.address.zipCode)}</CEP>
      </Endereco>
    </Issuer>
    <Customer>
      <Tipo>${escapeXml(document.customer.type.toUpperCase())}</Tipo>
      <Documento>${escapeXml(document.customer.document)}</Documento>
      <Nome>${escapeXml(document.customer.name)}</Nome>
      <Email>${escapeXml(document.customer.email ?? '')}</Email>
    </Customer>
    <Servicos>
${lines}
    </Servicos>
    <Subtotal>${document.subtotal.toFixed(2)}</Subtotal>
    <TotalIss>${document.totalIss.toFixed(2)}</TotalIss>
    <TotalPis>${document.totalPis.toFixed(2)}</TotalPis>
    <TotalCofins>${document.totalCofins.toFixed(2)}</TotalCofins>
    <TotalCsll>${document.totalCsll.toFixed(2)}</TotalCsll>
    <ValorTotal>${document.totalDocument.toFixed(2)}</ValorTotal>
    <Observacoes>${escapeXml(document.observations ?? '')}</Observacoes>
  </InfNfse>
</Nfse>`;
}

/**
 * NFS-e Emitter service — sends NFS-e to the municipal provider.
 *
 * NOTE: Production use requires:
 * 1. Official municipality SDK or certified API integration
 * 2. Digital certificate (e-CNPJ) for signing
 * 3. Production credentials from the municipal ISS authority
 * 4. Proper error handling for provider-specific quirks
 */
export class NfseEmitter {
  constructor(private readonly config: NfseEmitterConfig) {}

  /**
   * Create a draft NFS-e document from service lines.
   */
  createDraft(params: {
    numero: number;
    competencia: string;
    customer: NfseCustomer;
    services: readonly NfseServiceLine[];
    observations?: string;
  }): NfseDocument {
    const subtotal = params.services.reduce((sum, s) => sum + s.totalValue, 0);
    const totalIss = params.services.reduce((sum, s) => sum + s.issValue, 0);
    const totalPis = params.services.reduce((sum, s) => sum + s.pisValue, 0);
    const totalCofins = params.services.reduce((sum, s) => sum + s.cofinsValue, 0);
    const totalCsll = params.services.reduce((sum, s) => sum + s.csllValue, 0);
    const totalIrrf = params.services.reduce((sum, s) => sum + (s.irrfValue ?? 0), 0);
    const totalInss = params.services.reduce((sum, s) => sum + (s.inssValue ?? 0), 0);

    return {
      id: generateNfseId(),
      serie: '001',
      numero: params.numero,
      competencia: params.competencia,
      issuer: this.config.issuer,
      customer: params.customer,
      services: params.services,
      subtotal,
      totalIss,
      totalPis,
      totalCofins,
      totalCsll,
      totalIrrf,
      totalInss,
      totalDocument: subtotal + totalIss + totalPis + totalCofins + totalCsll + totalIrrf,
      observations: params.observations,
      createdAt: new Date().toISOString(),
      status: 'draft',
      provider: this.config.provider.provider
    };
  }

  /**
   * Issue (sign and send) NFS-e to the provider.
   */
  async issue(document: NfseDocument, operationKey = document.id): Promise<NfseDocument> {
    if (document.status !== 'draft') {
      throw new Error(`Cannot issue document in status: ${document.status}`);
    }

    const xml = buildNfseXml(document);

    try {
      const result = await this.sendToProvider(xml, operationKey);

      return {
        ...document,
        status: 'issued',
        authorizationCode: result.authorizationCode,
        verificationUrl: result.verificationUrl
      };
    } catch (error) {
      return {
        ...document,
        status: 'error',
        authorizationCode: undefined,
        verificationUrl: undefined,
        observations: appendProviderError(document.observations, toSafeProviderError(error))
      };
    }
  }

  /**
   * Cancel an issued NFS-e.
   */
  async cancel(
    document: NfseDocument,
    reason: string,
    operationKey = `${document.id}:cancel`
  ): Promise<NfseDocument> {
    if (document.status !== 'issued') {
      throw new Error(`Cannot cancel document in status: ${document.status}`);
    }

    if (!isSimulationEnabled(this.config)) {
      const cancellationXml = `<?xml version="1.0" encoding="UTF-8"?>
<CancelarNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Id>${document.id}</Id>
  <Numero>${document.numero}</Numero>
  <Motivo>${escapeXml(reason)}</Motivo>
</CancelarNfse>`;
      try {
        const result = await this.sendToProvider(cancellationXml, operationKey);
        return {
          ...document,
          status: 'cancelled',
          authorizationCode: result.authorizationCode,
          verificationUrl: result.verificationUrl,
          observations: `${document.observations ?? ''}\n[Cancelamento: ${reason}]`
        };
      } catch (error) {
        return {
          ...document,
          status: 'error',
          authorizationCode: undefined,
          verificationUrl: undefined,
          observations: appendProviderError(document.observations, toSafeProviderError(error))
        };
      }
    }

    return {
      ...document,
      status: 'cancelled',
      observations: `${document.observations ?? ''}\n[Cancelamento: ${reason}]`
    };
  }

  private async sendToProvider(xml: string, documentId: string): Promise<{
    authorizationCode: string;
    verificationUrl: string;
  }> {
    const { apiKey, certificate } = this.config.provider;

    if (isSimulationEnabled(this.config)) {
      const apiUrl = this.config.provider.apiUrl.trim();
      return {
        authorizationCode: `AUT${Date.now().toString().padStart(15, '0')}`,
        verificationUrl: `${apiUrl}/verificar/${generateNfseId('chk')}`
      };
    }

    const apiUrl = this.config.provider.apiUrl.trim();
    if (!apiUrl) {
      throw new NfseProviderError('NFS-e provider endpoint is not configured');
    }

    let endpoint: URL;
    try {
      endpoint = new URL(apiUrl);
    } catch {
      throw new NfseProviderError('NFS-e provider endpoint is invalid');
    }

    if (endpoint.hostname.endsWith('.invalid')) {
      throw new NfseProviderError('NFS-e provider endpoint is not configured');
    }

    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
      throw new NfseProviderError('NFS-e provider endpoint must be a credential-free HTTP URL');
    }

    if (endpoint.protocol !== 'https:' && process.env.NODE_ENV !== 'test') {
      throw new NfseProviderError('NFS-e provider endpoint must use HTTPS outside test mode');
    }

    const normalizedApiKey = apiKey?.trim();
    const hasCertificate = Buffer.isBuffer(certificate) && certificate.length > 0;
    if (!normalizedApiKey && !hasCertificate) {
      throw new NfseProviderError('NFS-e provider credential or certificate is not configured');
    }

    if (!normalizedApiKey && hasCertificate) {
      throw new NfseProviderError(
        'NFS-e PFX certificate signing is unavailable; configure a supported provider credential'
      );
    }

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...(normalizedApiKey ? { Authorization: `Bearer ${normalizedApiKey}` } : {}),
          'Idempotency-Key': documentId,
          'Content-Type': 'application/xml',
          Accept: 'application/json, application/xml, text/xml'
        },
        body: xml
      });
    } catch {
      throw new NfseProviderError('NFS-e provider request failed');
    }

    if (!response.ok) {
      throw new NfseProviderError(`NFS-e provider rejected document (HTTP ${response.status})`);
    }

    let body: string;
    try {
      body = await response.text();
    } catch {
      throw new NfseProviderError('NFS-e provider response could not be read');
    }

    let parsed: { authorizationCode?: string; verificationUrl?: string } = {};
    try {
      const json = JSON.parse(body) as Record<string, unknown>;
      parsed = {
        authorizationCode: normalizeProviderValue(json.authorizationCode),
        verificationUrl: normalizeProviderValue(json.verificationUrl)
      };
    } catch {
      const authorizationMatch = body.match(/<(?:AuthorizationCode|CodigoAutorizacao)>([^<]+)</i);
      if (authorizationMatch?.[1]) parsed.authorizationCode = normalizeProviderValue(authorizationMatch[1]);
      const verificationMatch = body.match(/<(?:VerificationUrl|UrlConsulta)>([^<]+)</i);
      if (verificationMatch?.[1]) parsed.verificationUrl = normalizeProviderValue(verificationMatch[1]);
    }

    const authorizationCode =
      parsed.authorizationCode
      ?? normalizeProviderValue(response.headers.get('x-authorization-code'))
      ?? undefined;
    if (!authorizationCode) {
      throw new NfseProviderError('NFS-e provider response did not include an authorization code');
    }

    const verificationUrl =
      parsed.verificationUrl
      ?? normalizeProviderValue(response.headers.get('x-verification-url'))
      ?? `${apiUrl}/${documentId}`;

    return {
      authorizationCode,
      verificationUrl: isHttpUrl(verificationUrl) ? verificationUrl : `${apiUrl}/${documentId}`
    };
  }
}

class NfseProviderError extends Error {
  constructor(readonly safeMessage: string) {
    super(safeMessage);
    this.name = 'NfseProviderError';
  }
}

function isSimulationEnabled(config: NfseEmitterConfig): boolean {
  const environment = process.env.NODE_ENV?.trim().toLowerCase();
  return config.allowSimulation === true
    && (environment === 'test' || environment === 'development' || environment === 'dev');
}

function toSafeProviderError(error: unknown): string {
  return error instanceof NfseProviderError
    ? error.safeMessage
    : 'NFS-e provider request failed';
}

function appendProviderError(observations: string | undefined, message: string): string {
  const safeMessage = message.slice(0, 180);
  const entry = `[NFS-e provider error: ${safeMessage}]`;
  return observations?.trim() ? `${observations.trim()}\n${entry}` : entry;
}

function normalizeProviderValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (
    normalized.length === 0
    || normalized.length > 255
    || /[\u0000-\u001F\u007F]/.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password;
  } catch {
    return false;
  }
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;'
    };
    return entities[character] ?? character;
  });
}
