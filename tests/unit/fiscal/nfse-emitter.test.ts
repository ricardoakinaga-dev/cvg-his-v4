import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NfseEmitter, LC116_SERVICE_CODES, generateNfseId, buildNfseXml } from '@cvg-his-v2/module-fiscal';

const mockConfig = {
  provider: { provider: 'abrasf', apiUrl: 'https://api.abrasf.com.br/nfse', apiKey: 'test-key' },
  issuer: {
    cnpj: '12345678000199',
    inscricaoMunicipal: '12345678',
    razaoSocial: 'Clinica Veterinaria Teste Ltda',
    address: {
      street: 'Rua Teste',
      number: '123',
      complement: 'Sala 1',
      district: 'Bairro Teste',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01001000'
    }
  },
  allowSimulation: true
};

describe('module-fiscal / nfse-emitter', () => {
  describe('LC116_SERVICE_CODES', () => {
    it('contains veterinary code 0407', () => {
      expect(LC116_SERVICE_CODES['0407']).toBeDefined();
      expect(LC116_SERVICE_CODES['0407'].description).toBe('Veterinária');
      expect(LC116_SERVICE_CODES['0407'].cnae).toBe('7500-1/00');
    });

    it('contains laboratory code 0403', () => {
      expect(LC116_SERVICE_CODES['0403']).toBeDefined();
      expect(LC116_SERVICE_CODES['0403'].description).toBe('Laboratório de análises clínicas');
    });

    it('contains imaging code 0405', () => {
      expect(LC116_SERVICE_CODES['0405']).toBeDefined();
    });

    it('all codes have description and cnae', () => {
      for (const [code, entry] of Object.entries(LC116_SERVICE_CODES)) {
        expect(entry.description).toBeDefined();
        expect(entry.cnae).toBeDefined();
        expect(code).toMatch(/^\d{4}$/);
      }
    });
  });

  describe('generateNfseId', () => {
    it('generates unique id with prefix', () => {
      const id1 = generateNfseId('nfse');
      const id2 = generateNfseId('nfse');
      expect(id1).toMatch(/^nfse_\w+_\w+$/);
      expect(id1).not.toBe(id2);
    });

    it('defaults prefix to nfse', () => {
      const id = generateNfseId();
      expect(id).toMatch(/^nfse_/);
    });
  });

  describe('buildNfseXml', () => {
    it('generates valid XML string', () => {
      const doc = {
        id: 'nfse_test_001',
        serie: '001',
        numero: '12345',
        competencia: '2026-04-01',
        issuer: mockConfig.issuer,
        customer: {
          type: 'PJ',
          document: '12345678000199',
          name: 'Cliente Teste',
          email: 'cliente@teste.com'
        },
        services: [
          {
            description: 'Consulta veterinaria',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 200,
            totalValue: 200,
            issRate: 0.05,
            issValue: 10,
            pisValue: 1.30,
            cofinsValue: 6,
            csllValue: 1.60
          }
        ],
        subtotal: 200,
        totalIss: 10,
        totalPis: 1.30,
        totalCofins: 6,
        totalCsll: 1.60,
        totalDocument: 217.90,
        observations: 'Teste'
      };
      const xml = buildNfseXml(doc);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Nfse');
      expect(xml).toContain('<InfNfse>');
      expect(xml).toContain('<Descricao>Consulta veterinaria</Descricao>');
      expect(xml).toContain('<CodigoServico>0407</CodigoServico>');
      expect(xml).toContain('<CNPJ>12345678000199</CNPJ>');
    });

    it('handles multiple service lines', () => {
      const doc = {
        id: 'nfse_test_002',
        serie: '001',
        numero: '12346',
        competencia: '2026-04-01',
        issuer: mockConfig.issuer,
        customer: { type: 'PJ', document: '98765432000188', name: 'Cliente 2' },
        services: [
          { description: 'Servico A', codigoServico: '0407', quantity: 1, unitValue: 100, totalValue: 100, issRate: 0.05, issValue: 5, pisValue: 0.65, cofinsValue: 3, csllValue: 0.80 },
          { description: 'Servico B', codigoServico: '0403', quantity: 2, unitValue: 50, totalValue: 100, issRate: 0.05, issValue: 5, pisValue: 0.65, cofinsValue: 3, csllValue: 0.80 }
        ],
        subtotal: 200,
        totalIss: 10,
        totalPis: 1.30,
        totalCofins: 6,
        totalCsll: 1.60,
        totalDocument: 217.90
      };
      const xml = buildNfseXml(doc);
      expect(xml).toContain('Servico A');
      expect(xml).toContain('Servico B');
      expect((xml.match(/<Servico>/g) || []).length).toBe(2);
    });

    it('escapes untrusted text fields instead of allowing XML injection', () => {
      const xml = buildNfseXml({
        id: 'nfse_test_003',
        serie: '001',
        numero: '12347',
        competencia: '2026-04-01',
        issuer: {
          ...mockConfig.issuer,
          razaoSocial: 'Clínica <oficial> & Cia'
        },
        customer: {
          type: 'PJ',
          document: '98765432000188',
          name: 'Cliente <script>alert(1)</script>',
          email: 'cliente&teste@example.com'
        },
        services: [{
          description: 'Consulta <urgente> & retorno',
          codigoServico: '0407',
          quantity: 1,
          unitValue: 100,
          totalValue: 100,
          issRate: 0.05,
          issValue: 5,
          pisValue: 0,
          cofinsValue: 0,
          csllValue: 0
        }],
        subtotal: 100,
        totalIss: 5,
        totalPis: 0,
        totalCofins: 0,
        totalCsll: 0,
        totalDocument: 105,
        observations: 'A & B'
      });

      expect(xml).toContain('Clínica &lt;oficial&gt; &amp; Cia');
      expect(xml).toContain('Consulta &lt;urgente&gt; &amp; retorno');
      expect(xml).toContain('Cliente &lt;script&gt;alert(1)&lt;/script&gt;');
      expect(xml).not.toContain('<script>alert(1)</script>');
    });
  });

  describe('NfseEmitter', () => {
    let emitter: NfseEmitter;

    beforeEach(() => {
      emitter = new NfseEmitter(mockConfig);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    describe('constructor', () => {
      it('stores config', () => {
        expect(emitter.config).toBe(mockConfig);
      });
    });

    describe('createDraft', () => {
      it('creates a draft NFS-e document', () => {
        const draft = emitter.createDraft({
          numero: '12347',
          competencia: '2026-04-01',
          customer: { type: 'PJ', document: '11122233000144', name: 'Paciente Ltda', email: 'contato@paciente.com' },
          services: [
            {
              description: 'Consulta',
              codigoServico: '0407',
              quantity: 1,
              unitValue: 150,
              totalValue: 150,
              issRate: 0.05,
              issValue: 7.50,
              pisValue: 0.98,
              cofinsValue: 4.50,
              csllValue: 1.20,
              irrfValue: 0,
              inssValue: 0
            }
          ],
          observations: 'Atendimento routine'
        });

        expect(draft.id).toMatch(/^nfse_/);
        expect(draft.serie).toBe('001');
        expect(draft.numero).toBe('12347');
        expect(draft.status).toBe('draft');
        expect(draft.provider).toBe('abrasf');
        expect(draft.subtotal).toBe(150);
        expect(draft.totalIss).toBe(7.50);
        expect(draft.issuer).toBe(mockConfig.issuer);
      });

      it('calculates totals from services', () => {
        const draft = emitter.createDraft({
          numero: '12348',
          competencia: '2026-04-01',
          customer: { type: 'PF', document: 'CPF', name: 'Fulano' },
          services: [
            { description: 'S1', codigoServico: '0407', quantity: 1, unitValue: 100, totalValue: 100, issRate: 0.05, issValue: 5, pisValue: 0.65, cofinsValue: 3, csllValue: 0.80, irrfValue: 0, inssValue: 0 },
            { description: 'S2', codigoServico: '0403', quantity: 1, unitValue: 200, totalValue: 200, issRate: 0.05, issValue: 10, pisValue: 1.30, cofinsValue: 6, csllValue: 1.60, irrfValue: 0, inssValue: 0 }
          ]
        });

        expect(draft.subtotal).toBe(300);
        expect(draft.totalIss).toBe(15);
        expect(draft.totalPis).toBeCloseTo(1.95, 2);
        expect(draft.totalCofins).toBe(9);
        expect(draft.totalCsll).toBeCloseTo(2.40, 2);
        expect(draft.totalDocument).toBeCloseTo(300 + 15 + 1.95 + 9 + 2.40, 2);
      });

      it('sets createdAt timestamp', () => {
        const draft = emitter.createDraft({
          numero: '12349',
          competencia: '2026-04-01',
          customer: { type: 'PF', document: 'CPF', name: 'Test' },
          services: [
            { description: 'S1', codigoServico: '0407', quantity: 1, unitValue: 50, totalValue: 50, issRate: 0.05, issValue: 2.50, pisValue: 0.33, cofinsValue: 1.50, csllValue: 0.40, irrfValue: 0, inssValue: 0 }
          ]
        });
        expect(draft.createdAt).toBeDefined();
        expect(new Date(draft.createdAt).toISOString()).toBe(draft.createdAt);
      });
    });

    describe('issue', () => {
      it('throws error when document is not draft', async () => {
        const doc = { status: 'issued' } as any;
        await expect(emitter.issue(doc)).rejects.toThrow('Cannot issue document in status: issued');
      });

      it('returns issued status on success', async () => {
        const draft = emitter.createDraft({
          numero: '12350',
          competencia: '2026-04-01',
          customer: { type: 'PJ', document: '99988877000166', name: 'Empresa' },
          services: [
            { description: 'Servico', codigoServico: '0407', quantity: 1, unitValue: 100, totalValue: 100, issRate: 0.05, issValue: 5, pisValue: 0.65, cofinsValue: 3, csllValue: 0.80, irrfValue: 0, inssValue: 0 }
          ]
        });

        const issued = await emitter.issue(draft);
        expect(issued.status).toBe('issued');
        expect(issued.authorizationCode).toBeDefined();
        expect(issued.verificationUrl).toBeDefined();
      });

      it('fails closed when simulation was not explicitly enabled', async () => {
        const { allowSimulation: _allowSimulation, ...productionConfig } = mockConfig;
        const productionEmitter = new NfseEmitter({
          ...productionConfig,
          provider: {
            ...productionConfig.provider,
            apiUrl: '',
            apiKey: undefined
          }
        });
        const draft = productionEmitter.createDraft({
          numero: 12351,
          competencia: '2026-04-01',
          customer: { type: 'cpf', document: '12345678909', name: 'Cliente' },
          services: [{
            description: 'Consulta',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0
          }]
        });

        const result = await productionEmitter.issue(draft);

        expect(result.status).toBe('error');
        expect(result.observations).toContain('provider endpoint');
        expect(result.authorizationCode).toBeUndefined();
      });

      it('ignores the simulator opt-in outside test and development environments', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        const productionEmitter = new NfseEmitter({
          ...mockConfig,
          allowSimulation: true,
          provider: {
            ...mockConfig.provider,
            apiUrl: '',
            apiKey: undefined
          }
        });
        const draft = productionEmitter.createDraft({
          numero: 12358,
          competencia: '2026-04-01',
          customer: { type: 'cpf', document: '12345678909', name: 'Cliente' },
          services: [{
            description: 'Consulta',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0
          }]
        });

        const result = await productionEmitter.issue(draft);

        expect(result.status).toBe('error');
        expect(result.observations).toContain('provider endpoint');
        expect(result.authorizationCode).toBeUndefined();
      });

      it('uses the configured HTTP transport and never exposes provider secrets in failures', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: async () => 'provider-secret=do-not-persist',
          headers: new Headers()
        });
        vi.stubGlobal('fetch', fetchMock);

        const productionEmitter = new NfseEmitter({
          ...mockConfig,
          allowSimulation: false,
          provider: {
            ...mockConfig.provider,
            apiUrl: 'https://municipal.example.test/nfse',
            apiKey: 'test-only-token'
          }
        });
        const draft = productionEmitter.createDraft({
          numero: 12352,
          competencia: '2026-04-01',
          customer: { type: 'cpf', document: '12345678909', name: 'Cliente' },
          services: [{
            description: 'Consulta <urgente>',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0
          }]
        });

        const result = await productionEmitter.issue(draft);

        expect(fetchMock).toHaveBeenCalledOnce();
        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(request.method).toBe('POST');
        expect(request.headers).toMatchObject({
          Authorization: 'Bearer test-only-token',
          'Content-Type': 'application/xml'
        });
        expect(String(request.body)).toContain('Consulta &lt;urgente&gt;');
        expect(result.status).toBe('error');
        expect(result.observations).toContain('HTTP 401');
        expect(result.observations).not.toContain('provider-secret');
        expect(result.observations).not.toContain('test-only-token');
      });

      it('passes the stable operation key to the provider for retry-safe delivery', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ authorizationCode: 'AUTH-IDEMPOTENT' }),
          headers: new Headers()
        });
        vi.stubGlobal('fetch', fetchMock);

        const productionEmitter = new NfseEmitter({
          ...mockConfig,
          allowSimulation: false,
          provider: {
            ...mockConfig.provider,
            apiUrl: 'https://municipal.example.test/nfse',
            apiKey: 'test-only-token'
          }
        });
        const draft = productionEmitter.createDraft({
          numero: 12359,
          competencia: '2026-04-01',
          customer: { type: 'cpf', document: '12345678909', name: 'Cliente' },
          services: [{
            description: 'Consulta',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0
          }]
        });

        await productionEmitter.issue(draft, 'nfse-operation-12359');

        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(request.headers).toMatchObject({ 'Idempotency-Key': 'nfse-operation-12359' });
      });

      it('accepts an authorized provider response through the HTTP transport', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            authorizationCode: 'AUTH-HTTP-123',
            verificationUrl: 'https://municipal.example.test/nfse/AUTH-HTTP-123'
          }),
          headers: new Headers()
        });
        vi.stubGlobal('fetch', fetchMock);

        const productionEmitter = new NfseEmitter({
          ...mockConfig,
          allowSimulation: false,
          provider: {
            ...mockConfig.provider,
            apiUrl: 'https://municipal.example.test/nfse',
            apiKey: 'test-only-token'
          }
        });
        const draft = productionEmitter.createDraft({
          numero: 12353,
          competencia: '2026-04-01',
          customer: { type: 'cpf', document: '12345678909', name: 'Cliente' },
          services: [{
            description: 'Consulta',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0
          }]
        });

        const result = await productionEmitter.issue(draft);

        expect(result.status).toBe('issued');
        expect(result.authorizationCode).toBe('AUTH-HTTP-123');
        expect(result.verificationUrl).toContain('AUTH-HTTP-123');
      });

      it('persists a safe error when a successful transport omits authorization', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ error: 'provider-private-diagnostic' }),
          headers: new Headers()
        });
        vi.stubGlobal('fetch', fetchMock);

        const productionEmitter = new NfseEmitter({
          ...mockConfig,
          allowSimulation: false,
          provider: {
            ...mockConfig.provider,
            apiUrl: 'https://municipal.example.test/nfse',
            apiKey: 'test-only-token'
          }
        });
        const draft = productionEmitter.createDraft({
          numero: 12354,
          competencia: '2026-04-01',
          customer: { type: 'cpf', document: '12345678909', name: 'Cliente' },
          services: [{
            description: 'Consulta',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0
          }]
        });

        const result = await productionEmitter.issue(draft);

        expect(result.status).toBe('error');
        expect(result.observations).toContain('authorization code');
        expect(result.observations).not.toContain('provider-private-diagnostic');
      });

      it('fails closed instead of sending an unsigned PFX-only request', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const productionEmitter = new NfseEmitter({
          ...mockConfig,
          allowSimulation: false,
          provider: {
            ...mockConfig.provider,
            apiUrl: 'https://municipal.example.test/nfse',
            apiKey: undefined,
            certificate: Buffer.from('fake-pfx')
          }
        });
        const draft = productionEmitter.createDraft({
          numero: 12355,
          competencia: '2026-04-01',
          customer: { type: 'cpf', document: '12345678909', name: 'Cliente' },
          services: [{
            description: 'Consulta',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0
          }]
        });

        const result = await productionEmitter.issue(draft);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.status).toBe('error');
        expect(result.observations).toContain('PFX');
      });

      it('does not call a configured endpoint without a credential or certificate', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const productionEmitter = new NfseEmitter({
          ...mockConfig,
          allowSimulation: false,
          provider: {
            ...mockConfig.provider,
            apiUrl: 'https://municipal.example.test/nfse',
            apiKey: undefined,
            certificate: undefined
          }
        });
        const draft = productionEmitter.createDraft({
          numero: 12357,
          competencia: '2026-04-01',
          customer: { type: 'cpf', document: '12345678909', name: 'Cliente' },
          services: [{
            description: 'Consulta',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0
          }]
        });

        const result = await productionEmitter.issue(draft);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.status).toBe('error');
        expect(result.observations).toContain('credential or certificate');
      });
    });

    describe('cancel', () => {
      it('throws error when document is not issued', async () => {
        const doc = { status: 'draft' } as any;
        await expect(emitter.cancel(doc, 'Reason')).rejects.toThrow('Cannot cancel document in status: draft');
      });

      it('sets status to cancelled with reason in observations', async () => {
        const doc = { status: 'issued', observations: '' } as any;
        const cancelled = await emitter.cancel(doc, 'Cliente solicitou');
        expect(cancelled.status).toBe('cancelled');
        expect(cancelled.observations).toContain('Cliente solicitou');
      });

      it('uses the provider transport for cancellation when simulation is disabled', async () => {
        const fetchMock = vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ authorizationCode: 'AUTH-ISSUE' }),
            headers: new Headers()
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ authorizationCode: 'AUTH-CANCEL' }),
            headers: new Headers()
          });
        vi.stubGlobal('fetch', fetchMock);

        const productionEmitter = new NfseEmitter({
          ...mockConfig,
          allowSimulation: false,
          provider: {
            ...mockConfig.provider,
            apiUrl: 'https://municipal.example.test/nfse',
            apiKey: 'test-only-token'
          }
        });
        const draft = productionEmitter.createDraft({
          numero: 12356,
          competencia: '2026-04-01',
          customer: { type: 'cpf', document: '12345678909', name: 'Cliente' },
          services: [{
            description: 'Consulta',
            codigoServico: '0407',
            quantity: 1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0
          }]
        });
        const issued = await productionEmitter.issue(draft);
        const cancelled = await productionEmitter.cancel(issued, 'Motivo <cliente>');

        expect(cancelled.status).toBe('cancelled');
        expect(cancelled.authorizationCode).toBe('AUTH-CANCEL');
        expect(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body)).toContain(
          'Motivo &lt;cliente&gt;'
        );
      });
    });
  });
});
