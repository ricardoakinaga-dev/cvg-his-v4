import { beforeEach, expect, test, vi } from 'vitest';

import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';

import { DatabaseFiscalRepository } from './database-fiscal.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn()
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQueryExplicit: vi.fn(async (pool: unknown, _accountId: unknown, fn: (client: unknown) => Promise<unknown>) =>
    fn(pool))
}));

const accountId = 'account-1';
const timestamp = new Date('2026-09-16T12:00:00.000Z');
const query = vi.fn();
const pool = { query };

const cfopRow = {
  code: '5102',
  description: 'Venda de mercadoria',
  section: 'saida',
  category: 'venda',
  applicable_to: ['nfe', 'nfce'],
  icms_relevant: true,
  pis_cofins_relevant: true,
  ipi_relevant: false
};

const tableRow = {
  id: 'tax-1',
  code: '00',
  description: null,
  percent: '18.00',
  ibs_percent: '0.10',
  cbs_percent: '0.90'
};

const icmsRuleRow = {
  id: 'rule-1',
  uf_origin: 'SP',
  uf_destination: 'RJ',
  ncm: null,
  rate: '12.00',
  cst: '00',
  operation_type: 'interestadual'
};

const layoutRow = {
  id: 'layout-1',
  account_id: accountId,
  city: 'São Paulo',
  state: 'SP',
  municipality_code: '3550308',
  provider: 'provider-x',
  version: '2.0',
  active: true,
  environment: 'homologacao',
  service_code: '1.01',
  service_focus: 'software'
};

const documentRow = {
  id: 'nfse-1',
  serie: 'A',
  numero: '10',
  competencia: '2026-09-16',
  issuer: JSON.stringify({ name: 'Issuer' }),
  customer: JSON.stringify({ name: 'Customer', document: '123' }),
  services: JSON.stringify([{ description: 'Consultoria', amount: 100 }]),
  subtotal: '100.00',
  total_iss: '2.00',
  total_pis: '0.65',
  total_cofins: '3.00',
  total_csll: '1.00',
  total_irrf: null,
  total_inss: null,
  total_document: '100.00',
  observations: null,
  created_at: timestamp,
  status: 'draft',
  provider: 'provider-x',
  authorization_code: null,
  verification_url: null,
  municipality_code: '3550308',
  api_url: 'https://provider.example.test',
  environment: 'homologacao',
  last_operation_kind: null,
  operation_lease_until: null
};

function response(rows: readonly Record<string, unknown>[] = []) {
  return { rows };
}

function documentInput() {
  return {
    id: 'nfse-1',
    serie: 'A',
    numero: 10,
    competencia: '2026-09-16',
    issuer: { name: 'Issuer' },
    customer: { name: 'Customer', document: '123' },
    services: [{ description: 'Consultoria', amount: 100 }],
    subtotal: 100,
    totalIss: 2,
    totalPis: 0.65,
    totalCofins: 3,
    totalCsll: 1,
    totalIrrf: undefined,
    totalInss: undefined,
    totalDocument: 100,
    observations: undefined,
    createdAt: timestamp.toISOString(),
    status: 'draft',
    provider: 'provider-x',
    authorizationCode: undefined,
    verificationUrl: undefined,
    municipalityCode: '3550308',
    apiUrl: 'https://provider.example.test',
    environment: 'homologacao'
  };
}

beforeEach(() => {
  query.mockReset();
  vi.mocked(getPool).mockReturnValue(pool as never);
  vi.mocked(withTenantQueryExplicit).mockImplementation(
    async (client, _accountId, fn) => fn(client as never)
  );
});

test('DatabaseFiscalRepository covers catalog filters and CRUD mappings', async () => {
  const repository = new DatabaseFiscalRepository();

  query.mockResolvedValueOnce(response([cfopRow]));
  expect(await repository.listCfop({ accountId, search: 'venda', section: 'saida', documentType: 'nfe' })).toEqual([
    expect.objectContaining({ code: '5102', documentTypesLabel: 'NFE, NFCE' })
  ]);
  query.mockResolvedValueOnce(response([{ ...cfopRow, applicable_to: '["nfse"]' }]));
  expect(await repository.listCfop({ accountId })).toHaveLength(1);
  query.mockResolvedValueOnce(response([]));
  expect(await repository.findCfopByCode('missing')).toBeNull();
  query.mockResolvedValueOnce(response([{ ...cfopRow, applicable_to: '["nfe"]' }]));
  expect(await repository.findCfopByCode('5102')).toMatchObject({ applicableTo: ['nfe'] });
  query.mockResolvedValueOnce(response([cfopRow]));
  expect(await repository.createCfop(accountId as never, {
    ...cfopRow,
    applicableTo: ['nfe'],
    icmsRelevant: true,
    pisCofinsRelevant: true,
    ipiRelevant: false
  } as never)).toMatchObject({ code: '5102' });
  query.mockResolvedValueOnce(response([]));
  expect(await repository.updateCfop(accountId as never, 'missing', {} as never)).toBeNull();
  query.mockResolvedValueOnce(response([cfopRow]));
  expect(await repository.updateCfop(accountId as never, '5102', {
    ...cfopRow,
    applicableTo: ['nfe'],
    icmsRelevant: true,
    pisCofinsRelevant: true,
    ipiRelevant: false
  } as never)).toMatchObject({ code: '5102' });

  const simpleTableCases = [
    ['listIcmsTables', 'createIcmsTable', 'updateIcmsTable'],
    ['listIpiTables', 'createIpiTable', 'updateIpiTable'],
    ['listPisTables', 'createPisTable', 'updatePisTable'],
    ['listCofinsTables', 'createCofinsTable', 'updateCofinsTable']
  ] as const;
  for (const [listMethod, createMethod, updateMethod] of simpleTableCases) {
    query.mockResolvedValueOnce(response([tableRow]));
    expect(await repository[listMethod]({ accountId, search: '18' } as never)).toHaveLength(1);
    query.mockResolvedValueOnce(response([tableRow]));
    expect(await repository[createMethod](accountId as never, tableRow as never)).toMatchObject({
      id: 'tax-1',
      description: '',
      percent: 18
    });
    query.mockResolvedValueOnce(response([]));
    expect(await repository[updateMethod](accountId as never, 'missing', {} as never)).toBeNull();
    query.mockResolvedValueOnce(response([tableRow]));
    expect(await repository[updateMethod](accountId as never, 'tax-1', {} as never)).toMatchObject({
      id: 'tax-1',
      description: '',
      percent: 18
    });
    query.mockResolvedValueOnce(response([]));
    expect(await repository[listMethod]({ accountId } as never)).toEqual([]);
  }

  query.mockResolvedValueOnce(response([tableRow]));
  expect(await repository.listIbsCbsTables({ accountId, search: 'ibs' })).toMatchObject([
    { description: '', ibsPercent: 0.1, cbsPercent: 0.9 }
  ]);
  query.mockResolvedValueOnce(response([tableRow]));
  expect(await repository.createIbsCbsTable(accountId as never, tableRow as never)).toMatchObject({
    ibsPercent: 0.1,
    cbsPercent: 0.9
  });
  query.mockResolvedValueOnce(response([]));
  expect(await repository.updateIbsCbsTable(accountId as never, 'missing', {} as never)).toBeNull();
  query.mockResolvedValueOnce(response([tableRow]));
  expect(await repository.updateIbsCbsTable(accountId as never, 'tax-1', {} as never)).toMatchObject({
    ibsPercent: 0.1
  });

  query.mockResolvedValueOnce(response([icmsRuleRow]));
  expect(await repository.listIcmsRules({
    accountId,
    ufOrigin: 'SP',
    ufDestination: 'RJ',
    ncm: '0101',
    operationType: 'interestadual'
  })).toMatchObject([{ ufOrigin: 'SP', rate: 12, ncm: null }]);
  query.mockResolvedValueOnce(response([]));
  expect(await repository.listIcmsRules({ accountId })).toEqual([]);
  query.mockResolvedValueOnce(response([icmsRuleRow]));
  expect(await repository.createIcmsMatrixRule(accountId as never, {
    ufOrigin: 'SP',
    ufDestination: 'RJ',
    rate: 12,
    cst: '00',
    operationType: 'interestadual'
  })).toMatchObject({ id: 'rule-1', ncm: '' });

  query.mockResolvedValueOnce(response([{ id: 'ncm-1', ncm: '0101', category: 'animal', ipi_rate: '1.5', source: 'RFB', notes: null }]));
  expect(await repository.listNcmEntries({ accountId, search: 'animal' })).toMatchObject([
    { id: 'ncm-1', ipiRate: 1.5, notes: '' }
  ]);
  query.mockResolvedValueOnce(response([]));
  expect(await repository.listNcmEntries({ accountId })).toEqual([]);
  query.mockResolvedValueOnce(response([{ id: 'pis-1', regime: 'lucro_real', applies_to: 'ambos', pis_rate: '1.65', cofins_rate: '7.6', notes: null }]));
  expect(await repository.listPisCofinsRules({ accountId, regime: 'lucro_real', appliesTo: 'ambos' })).toMatchObject([
    { id: 'pis-1', pisRate: 1.65, cofinsRate: 7.6, notes: '' }
  ]);
  query.mockResolvedValueOnce(response([]));
  expect(await repository.listPisCofinsRules({ accountId })).toEqual([]);
});

test('DatabaseFiscalRepository covers tenant layouts and NFS-e lifecycle leases', async () => {
  const repository = new DatabaseFiscalRepository();

  query.mockResolvedValueOnce(response([layoutRow]));
  expect(await repository.listNfseLayouts({ accountId, state: 'SP', search: 'São', active: true })).toMatchObject([
    { id: 'layout-1', municipalityCode: '3550308' }
  ]);
  query.mockResolvedValueOnce(response([layoutRow]));
  expect(await repository.createNfseLayout(accountId as never, {
    ...layoutRow,
    accountId,
    municipalityCode: '',
    serviceCode: '',
    serviceFocus: ''
  } as never)).toMatchObject({ id: 'layout-1' });
  query.mockResolvedValueOnce(response([]));
  expect(await repository.updateNfseLayout(accountId as never, 'missing', {} as never)).toBeNull();
  query.mockResolvedValueOnce(response([{ ...layoutRow, account_id: null, municipality_code: null, service_code: null, service_focus: null }]));
  query.mockResolvedValueOnce(response([layoutRow]));
  expect(await repository.updateNfseLayout(accountId as never, 'layout-1', {} as never)).toMatchObject({ id: 'layout-1' });
  query.mockResolvedValueOnce(response(layoutRow ? [layoutRow] : []));
  query.mockResolvedValueOnce(response([]));
  expect(await repository.updateNfseLayout(accountId as never, 'layout-1', { city: 'Campinas' } as never)).toBeNull();

  query.mockResolvedValueOnce(response([documentRow]));
  expect(await repository.listNfseDocuments({
    accountId,
    status: 'draft',
    customerSearch: 'Customer',
    search: 'Consultoria',
    competenciaFrom: '2026-01-01',
    competenciaTo: '2026-12-31',
    limit: 10
  })).toMatchObject([{ id: 'nfse-1', totalIrrf: 0, observations: undefined }]);
  query.mockResolvedValueOnce(response([]));
  expect(await repository.listNfseDocuments({ accountId })).toEqual([]);
  query.mockResolvedValueOnce(response([]));
  expect(await repository.findNfseDocument(accountId as never, 'missing')).toBeNull();
  query.mockResolvedValueOnce(response([documentRow]));
  expect(await repository.findNfseDocument(accountId as never, 'nfse-1')).toMatchObject({ id: 'nfse-1' });

  query.mockResolvedValueOnce(response([]));
  expect(await repository.claimNfseOperation(accountId as never, 'missing', 'issue', 'op-1', 'provider-1')).toBeNull();
  query.mockResolvedValueOnce(response([{ ...documentRow, status: 'issued' }]));
  expect(await repository.claimNfseOperation(accountId as never, 'nfse-1', 'issue', 'op-1', 'provider-1')).toMatchObject({ state: 'completed' });
  query.mockResolvedValueOnce(response([documentRow]));
  query.mockResolvedValueOnce(response([{ ...documentRow, status: 'draft', last_operation_kind: 'issue' }]));
  expect(await repository.claimNfseOperation(accountId as never, 'nfse-1', 'issue', 'op-1', 'provider-1')).toMatchObject({ state: 'claimed' });
  query.mockResolvedValueOnce(response([{ ...documentRow, status: 'issued' }]));
  query.mockResolvedValueOnce(response([{ ...documentRow, status: 'issued', last_operation_kind: 'cancel' }]));
  expect(await repository.claimNfseOperation(accountId as never, 'nfse-1', 'cancel', 'op-2', 'provider-2')).toMatchObject({ state: 'claimed' });
  query.mockResolvedValueOnce(response([{ ...documentRow, status: 'draft', operation_lease_until: new Date(Date.now() + 60_000).toISOString() }]));
  await expect(repository.claimNfseOperation(accountId as never, 'nfse-1', 'issue', 'op-3', 'provider-3')).rejects.toThrow(/already in progress/);
  query.mockResolvedValueOnce(response([{ ...documentRow, status: 'cancelled' }]));
  expect(await repository.claimNfseOperation(accountId as never, 'nfse-1', 'cancel', 'op-4', 'provider-4')).toMatchObject({ state: 'completed' });
  query.mockResolvedValueOnce(response([{ ...documentRow, status: 'cancelled' }]));
  await expect(repository.claimNfseOperation(accountId as never, 'nfse-1', 'issue', 'op-5', 'provider-5')).rejects.toThrow(/Cannot issue/);

  const input = documentInput();
  query.mockResolvedValueOnce(response([documentRow]));
  expect(await repository.createNfseDocument(accountId as never, input as never)).toMatchObject({ id: 'nfse-1' });
  query.mockResolvedValueOnce(response([]));
  expect(await repository.updateNfseDocument(accountId as never, input as never)).toBeNull();
  query.mockResolvedValueOnce(response([documentRow]));
  expect(await repository.updateNfseDocument(accountId as never, input as never)).toMatchObject({ id: 'nfse-1' });
});
