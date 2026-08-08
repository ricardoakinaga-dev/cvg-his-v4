import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { AccountId } from '@cvg-his-v2/shared-types';

import type {
  DatabaseFiscalRepository,
  PersistedNfseDocument
} from './database-fiscal.repository.js';
import { FiscalService } from './service.js';

test('FiscalService returns searchable CFOP data from the backend catalog', async () => {
  const service = new FiscalService();

  const rows = await service.listCfop({ search: 'serviço', documentType: 'nfse' });

  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.documentTypesLabel.length > 0));
  assert.ok(rows.some((row) => row.category === 'servico'));
});

test('FiscalService creates and updates simple CFOP entries', async () => {
  const service = new FiscalService();

  const created = await service.createCfop({
    code: '9.999',
    description: 'Operacao fiscal veterinaria',
    section: 'saida',
    category: 'servico',
    applicableTo: ['nfse']
  });

  assert.equal(created.code, '9.999');
  assert.equal(created.description, 'Operacao fiscal veterinaria');
  assert.equal(created.documentTypesLabel, 'NFSE');

  const updated = await service.updateCfop(created.code, {
    description: 'Operacao fiscal veterinaria atualizada',
    applicableTo: ['nfe']
  });

  assert.ok(updated);
  assert.equal(updated?.description, 'Operacao fiscal veterinaria atualizada');
  assert.equal(updated?.documentTypesLabel, 'NFE');

  const filtered = await service.listCfop({ search: 'atualizada' });
  assert.ok(filtered.some((row) => row.code === created.code));
});

test('FiscalService filters ICMS, IPI, PIS, COFINS, PIS/COFINS and NFS-e tables using backend criteria', async () => {
  const service = new FiscalService();

  const icmsRows = await service.listIcmsTables({ search: '18' });
  const ipiRows = await service.listIpiTables({ search: '3,25' });
  const pisRows = await service.listPisTables({ search: '0,65' });
  const cofinsRows = await service.listCofinsTables({ search: '7,6' });
  const pisCofinsRows = await service.listPisCofinsRules({ regime: 'lucro_real', appliesTo: 'servico' });
  const nfseLayouts = await service.listNfseLayouts({ search: 'ISS SP', state: 'SP', active: true });

  assert.ok(icmsRows.length > 0);
  assert.ok(icmsRows.every((row) => `${row.code} ${row.description}`.includes('18')));
  assert.ok(ipiRows.length > 0);
  assert.ok(ipiRows.every((row) => `${row.code} ${row.description}`.includes('3,25')));
  assert.ok(pisRows.length > 0);
  assert.ok(pisRows.every((row) => `${row.code} ${row.description}`.includes('0,65')));
  assert.ok(cofinsRows.length > 0);
  assert.ok(cofinsRows.every((row) => `${row.code} ${row.description}`.includes('7,6')));
  assert.ok(pisCofinsRows.length > 0);
  assert.ok(pisCofinsRows.every((row) => row.regime === 'lucro_real'));
  assert.ok(pisCofinsRows.every((row) => row.appliesTo === 'servico'));
  assert.ok(nfseLayouts.length > 0);
  assert.ok(nfseLayouts.every((row) => row.state === 'SP' && row.active));
  assert.ok(nfseLayouts.every((row) => `${row.city} ${row.provider} ${row.municipalityCode}`.includes('ISS SP')));
});

test('FiscalService creates and updates simple ICMS table entries', async () => {
  const service = new FiscalService();

  const created = await service.createIcmsTable({
    code: '19',
    description: 'ICMS 19%',
    percent: 19
  });

  assert.equal(created.code, '19');
  assert.equal(created.description, 'ICMS 19%');
  assert.equal(created.percent, 19);

  const updated = await service.updateIcmsTable(created.id, {
    description: 'ICMS interno 19%',
    percent: 19.5
  });

  assert.ok(updated);
  assert.equal(updated?.description, 'ICMS interno 19%');
  assert.equal(updated?.percent, 19.5);

  const filtered = await service.listIcmsTables({ search: 'interno' });
  assert.ok(filtered.some((table) => table.id === created.id));
});

test('FiscalService creates and updates simple IPI table entries', async () => {
  const service = new FiscalService();

  const created = await service.createIpiTable({
    code: '8',
    description: 'IPI 8%',
    percent: 8
  });

  assert.equal(created.code, '8');
  assert.equal(created.description, 'IPI 8%');
  assert.equal(created.percent, 8);

  const updated = await service.updateIpiTable(created.id, {
    description: 'IPI interno 8%',
    percent: 8.5
  });

  assert.ok(updated);
  assert.equal(updated?.description, 'IPI interno 8%');
  assert.equal(updated?.percent, 8.5);

  const filtered = await service.listIpiTables({ search: 'interno' });
  assert.ok(filtered.some((table) => table.id === created.id));
});

test('FiscalService creates and updates simple PIS table entries', async () => {
  const service = new FiscalService();

  const created = await service.createPisTable({
    code: '2',
    description: 'PIS 2%',
    percent: 2
  });

  assert.equal(created.code, '2');
  assert.equal(created.description, 'PIS 2%');
  assert.equal(created.percent, 2);

  const updated = await service.updatePisTable(created.id, {
    description: 'PIS interno 2%',
    percent: 2.1
  });

  assert.ok(updated);
  assert.equal(updated?.description, 'PIS interno 2%');
  assert.equal(updated?.percent, 2.1);

  const filtered = await service.listPisTables({ search: 'interno' });
  assert.ok(filtered.some((table) => table.id === created.id));
});

test('FiscalService creates and updates simple COFINS table entries', async () => {
  const service = new FiscalService();

  const created = await service.createCofinsTable({
    code: '4',
    description: 'COFINS 4%',
    percent: 4
  });

  assert.equal(created.code, '4');
  assert.equal(created.description, 'COFINS 4%');
  assert.equal(created.percent, 4);

  const updated = await service.updateCofinsTable(created.id, {
    description: 'COFINS interno 4%',
    percent: 4.1
  });

  assert.ok(updated);
  assert.equal(updated?.description, 'COFINS interno 4%');
  assert.equal(updated?.percent, 4.1);

  const filtered = await service.listCofinsTables({ search: 'interno' });
  assert.ok(filtered.some((table) => table.id === created.id));
});

test('FiscalService creates and updates simple IBS/CBS table entries', async () => {
  const service = new FiscalService();

  const created = await service.createIbsCbsTable({
    code: 'TRANSICAO',
    description: 'Transicao 2026',
    ibsPercent: 0.1,
    cbsPercent: 0.9
  });

  assert.equal(created.code, 'TRANSICAO');
  assert.equal(created.description, 'Transicao 2026');
  assert.equal(created.ibsPercent, 0.1);
  assert.equal(created.cbsPercent, 0.9);

  const updated = await service.updateIbsCbsTable(created.id, {
    description: 'Transicao IBS/CBS revisada',
    ibsPercent: 0.2,
    cbsPercent: 0.8
  });

  assert.ok(updated);
  assert.equal(updated?.description, 'Transicao IBS/CBS revisada');
  assert.equal(updated?.ibsPercent, 0.2);
  assert.equal(updated?.cbsPercent, 0.8);

  const filtered = await service.listIbsCbsTables({ search: 'revisada' });
  assert.ok(filtered.some((table) => table.id === created.id));
});

test('FiscalService builds dashboard and tax preview from real module data', async () => {
  const service = new FiscalService();

  const summary = await service.getDashboardSummary();
  const preview = await service.getTaxPreview();

  assert.ok(summary.cfopCount > 0);
  assert.ok(summary.icmsRules > 0);
  assert.ok(summary.alerts.length > 0);
  assert.equal(summary.readOnly, false);
  assert.ok(summary.pendingScopes.length > 0);
  assert.ok(preview.mercadoria.totalWithTax > preview.mercadoria.baseValue);
  assert.ok(preview.servico.totalWithTax > preview.servico.baseValue);
});

test('FiscalService exposes filtered NCM catalog and consolidated ICMS matrix', async () => {
  const service = new FiscalService();

  const ncmRows = await service.listNcmEntries({ search: 'imagem' });
  const matrixRows = await service.listIcmsMatrix({
    search: 'RJ',
    ufOrigin: 'SP',
    operationType: 'interestadual'
  });

  assert.equal(ncmRows.length, 1);
  assert.equal(ncmRows[0]?.ncm, '9022');
  assert.ok(ncmRows[0]?.notes.toLowerCase().includes('ultrassom'));

  assert.ok(matrixRows.length > 0);
  assert.ok(matrixRows.every((row) => row.ufOrigin === 'SP'));
  assert.ok(matrixRows.every((row) => row.operationType === 'interestadual'));
  assert.ok(matrixRows.every((row) => `${row.id} ${row.ufDestination}`.includes('RJ')));
  assert.ok(matrixRows.some((row) => row.ufDestination === 'RJ' && row.rate === 12));
});

test('FiscalService creates ICMS state matrix entries', async () => {
  const service = new FiscalService();

  const created = await service.createIcmsMatrix({
    ufOrigin: 'SP',
    ufDestination: 'BA',
    operationType: 'interestadual',
    rate: 7
  });

  assert.equal(created.ufOrigin, 'SP');
  assert.equal(created.ufDestination, 'BA');
  assert.equal(created.operationType, 'interestadual');
  assert.equal(created.rate, 7);

  const filtered = await service.listIcmsMatrix({ search: 'BA' });
  assert.ok(filtered.some((row) => row.id === created.id));
});

test('FiscalService creates and updates NFS-e layouts in backoffice mode', async () => {
  const service = new FiscalService();

  const created = await service.createNfseLayout({
    city: 'Campinas',
    state: 'SP',
    municipalityCode: '3509502',
    provider: 'ISS Campinas',
    version: 'v1',
    active: false,
    environment: 'homologacao',
    serviceCode: '0407',
    serviceFocus: 'Expansão interior'
  });

  assert.equal(created.city, 'Campinas');
  assert.equal(created.state, 'SP');
  assert.equal(created.active, false);

  const updated = await service.updateNfseLayout(created.id, {
    active: true,
    environment: 'producao'
  });

  assert.ok(updated);
  assert.equal(updated?.active, true);
  assert.equal(updated?.environment, 'producao');

  const filtered = await service.listNfseLayouts({ state: 'SP', active: true });
  assert.ok(filtered.some((layout) => layout.id === created.id));
});

test('FiscalService applies defaults and sanitization when creating draft NFS-e documents', async () => {
  const service = new FiscalService();

  const created = await service.createNfseDocument({
    provider: 'iss_net',
    customer: {
      type: 'cpf',
      document: ' 123.456.789-09 ',
      name: '  Ana Fiscal ',
      email: '  ana@example.com ',
      phone: '  +5511911110000 '
    },
    services: [
      {
        description: ' Painel laboratorial ',
        codigoServico: '0403',
        cnae: '8640-2/02',
        quantity: 1,
        unitValue: 240,
        totalValue: 240,
        issRate: 0.05,
        issValue: 12,
        pisValue: 0,
        cofinsValue: 0,
        csllValue: 0,
        irrfValue: 0,
        inssValue: 0
      }
    ],
    observations: '  janela de coleta  '
  });

  assert.equal(created.status, 'draft');
  assert.equal(created.serie, '001');
  assert.equal(created.provider, 'iss_net');
  assert.equal(created.customer.document, '123.456.789-09');
  assert.equal(created.customer.name, 'Ana Fiscal');
  assert.equal(created.customer.email, 'ana@example.com');
  assert.equal(created.customer.phone, '+5511911110000');
  assert.equal(created.observations, 'janela de coleta');
  assert.match(created.competencia, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(created.numero > 0);
});

test('FiscalService rejects invalid draft payloads and invalid NFS-e transitions', async () => {
  const service = new FiscalService();

  await assert.rejects(
    () =>
      service.createNfseDocument({
        customer: {
          type: 'cnpj',
          document: '12.345.678/0001-90',
          name: 'Hospital Invalido'
        },
        services: [
          {
            description: 'Consulta',
            codigoServico: '0407',
            cnae: '7500-1/00',
            quantity: -1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0,
            irrfValue: 0,
            inssValue: 0
          }
        ]
      }),
    /service\.quantity must be zero or positive/
  );

  const created = await service.createNfseDocument({
    serie: '001',
    numero: 2010,
    customer: {
      type: 'cnpj',
      document: '98.765.432/0001-10',
      name: 'Clinica Beta'
    },
    services: [
      {
        description: 'Consulta retorno',
        codigoServico: '0407',
        cnae: '7500-1/00',
        quantity: 1,
        unitValue: 120,
        totalValue: 120,
        issRate: 0.05,
        issValue: 6,
        pisValue: 0,
        cofinsValue: 0,
        csllValue: 0,
        irrfValue: 0,
        inssValue: 0
      }
    ]
  });

  await assert.rejects(() => service.cancelNfseDocument(created.id, { reason: 'nao pode ainda' }), {
    message: /Cannot cancel document in status: draft/
  });

  const issued = await service.issueNfseDocument(created.id);
  assert.equal(issued?.status, 'issued');

  await assert.rejects(() => service.issueNfseDocument(created.id), {
    message: /Cannot issue document in status: issued/
  });

  await assert.rejects(() => service.cancelNfseDocument(created.id, { reason: '   ' }), {
    message: /reason is required/
  });
});

test('FiscalService cria e altera ciclo documental NFS-e', async () => {
  const service = new FiscalService();

  const created = await service.createNfseDocument({
    competencia: '2026-04-17',
    serie: '001',
    numero: 2002,
    provider: 'abrasf',
    customer: {
      type: 'cnpj',
      document: '12.345.678/0001-90',
      name: 'Hospital Alpha',
      email: 'finance@alpha.example',
      phone: '+5511999990000'
    },
    services: [
      {
        description: 'Consulta especializada',
        codigoServico: '0407',
        cnae: '7500-1/00',
        quantity: 1,
        unitValue: 150,
        totalValue: 150,
        issRate: 0.05,
        issValue: 7.5,
        pisValue: 0,
        cofinsValue: 0,
        csllValue: 0,
        irrfValue: 0,
        inssValue: 0
      }
    ]
  });

  assert.equal(created.status, 'draft');
  assert.equal(created.numero, 2002);

  const draftList = await service.listNfseDocuments({ status: 'draft' });
  assert.ok(draftList.some((item) => item.id === created.id));

  const issued = await service.issueNfseDocument(created.id);
  assert.ok(issued);
  assert.equal(issued?.status, 'issued');
  assert.ok(issued?.authorizationCode);

  const issuedList = await service.listNfseDocuments({ status: 'issued' });
  assert.ok(issuedList.some((item) => item.id === created.id));

  const cancelled = await service.cancelNfseDocument(created.id, { reason: 'teste automatizado' });
  assert.ok(cancelled);
  assert.equal(cancelled?.status, 'cancelled');

  const single = await service.getNfseDocument(created.id);
  assert.equal(single?.status, 'cancelled');
  assert.equal(single?.authorizationCode, issued?.authorizationCode);
});

test('FiscalService persists the NFS-e lifecycle through the tenant repository', async () => {
  const accountId = 'account-nfse-test' as AccountId;
  const documents: PersistedNfseDocument[] = [];
  const repository = {
    listNfseDocuments: async (filters: { status?: PersistedNfseDocument['status']; customerSearch?: string }) =>
      documents
        .filter((document) => !filters.status || document.status === filters.status)
        .filter((document) => !filters.customerSearch || document.customer.name.includes(filters.customerSearch))
        .map((document) => ({ ...document })),
    findNfseDocument: async (_account: AccountId, id: string) =>
      documents.find((document) => document.id === id) ?? null,
    createNfseDocument: async (_account: AccountId, document: PersistedNfseDocument) => {
      documents.unshift({ ...document });
      return { ...document };
    },
    updateNfseDocument: async (_account: AccountId, document: PersistedNfseDocument) => {
      const index = documents.findIndex((current) => current.id === document.id);
      if (index === -1) return null;
      documents[index] = { ...document };
      return { ...document };
    }
  } as unknown as DatabaseFiscalRepository;

  const createDocument = async (service: FiscalService) => service.createNfseDocument({
    numero: 9021,
    provider: 'abrasf',
    customer: {
      type: 'cnpj',
      document: '12.345.678/0001-90',
      name: 'Tenant Persistente'
    },
    services: [{
      description: 'Consulta veterinária',
      codigoServico: '0407',
      cnae: '7500-1/00',
      quantity: 1,
      unitValue: 180,
      totalValue: 180,
      issRate: 0.05,
      issValue: 9,
      pisValue: 0,
      cofinsValue: 0,
      csllValue: 0,
      irrfValue: 0,
      inssValue: 0
    }]
  });

  const firstService = new FiscalService(repository, accountId);
  const created = await createDocument(firstService);
  assert.equal(documents.length, 1);
  assert.equal((await firstService.listNfseDocuments({ status: 'draft' }))[0]?.id, created.id);

  const secondService = new FiscalService(repository, accountId);
  const issued = await secondService.issueNfseDocument(created.id);
  assert.equal(issued?.status, 'issued');
  assert.equal((await secondService.getNfseDocument(created.id))?.status, 'issued');

  const cancelled = await secondService.cancelNfseDocument(created.id, { reason: 'cancelamento de teste' });
  assert.equal(cancelled?.status, 'cancelled');
  assert.equal((await new FiscalService(repository, accountId).getNfseDocument(created.id))?.status, 'cancelled');
});
