import assert from 'node:assert/strict';
import test from 'node:test';

import { FiscalService } from './service.js';

test('FiscalService returns searchable CFOP data from the backend catalog', () => {
  const service = new FiscalService();

  const rows = service.listCfop({ search: 'serviço', documentType: 'nfse' });

  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.documentTypesLabel.length > 0));
  assert.ok(rows.some((row) => row.category === 'servico'));
});

test('FiscalService filters ICMS, PIS/COFINS and NFS-e tables using backend criteria', () => {
  const service = new FiscalService();

  const icmsRows = service.listIcmsRules({ ufDestination: 'RJ', operationType: 'interestadual' });
  const pisCofinsRows = service.listPisCofinsRules({ regime: 'lucro_real', appliesTo: 'servico' });
  const nfseLayouts = service.listNfseLayouts({ state: 'SP', active: true });

  assert.ok(icmsRows.length > 0);
  assert.ok(icmsRows.every((row) => row.ufDestination === 'RJ'));
  assert.ok(icmsRows.every((row) => row.operationType === 'interestadual'));
  assert.ok(pisCofinsRows.length > 0);
  assert.ok(pisCofinsRows.every((row) => row.regime === 'lucro_real'));
  assert.ok(pisCofinsRows.every((row) => row.appliesTo === 'servico'));
  assert.ok(nfseLayouts.length > 0);
  assert.ok(nfseLayouts.every((row) => row.state === 'SP' && row.active));
});

test('FiscalService builds dashboard and tax preview from real module data', () => {
  const service = new FiscalService();

  const summary = service.getDashboardSummary();
  const preview = service.getTaxPreview();

  assert.ok(summary.cfopCount > 0);
  assert.ok(summary.icmsRules > 0);
  assert.ok(summary.alerts.length > 0);
  assert.equal(summary.readOnly, true);
  assert.ok(summary.pendingScopes.length > 0);
  assert.ok(preview.mercadoria.totalWithTax > preview.mercadoria.baseValue);
  assert.ok(preview.servico.totalWithTax > preview.servico.baseValue);
});
