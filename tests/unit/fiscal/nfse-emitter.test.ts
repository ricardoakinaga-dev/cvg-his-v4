import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  }
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
  });

  describe('NfseEmitter', () => {
    let emitter: NfseEmitter;

    beforeEach(() => {
      emitter = new NfseEmitter(mockConfig);
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
    });
  });
});