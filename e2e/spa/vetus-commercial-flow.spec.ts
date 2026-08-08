import { test, expect } from './fixtures/spa-fixture';

/**
 * P2-001 — Vetus commercial flow.
 *
 * Covers the commercial parity path added in the GAP96 wave:
 * - persisted loyalty points and redemption
 * - persisted price table and item
 * - persisted POS sync job
 * - SPA surfaces for loyalty, price tables and POS operational report
 */

test.describe('Vetus Comercial — fidelidade, tabelas de preço e PDV', () => {
  test('exibe fidelidade, tabela de preço e job PDV criados pela API', async ({
    spaPage,
    page,
    apiCall,
    cleanup
  }) => {
    const suffix = Date.now();
    const owner = await apiCall.post('/owners', {
      fullName: `Tutor Comercial E2E ${suffix}`,
      documentId: `COM-E2E-${suffix}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: false,
      status: 'active'
    });
    cleanup.track({ type: 'owner', id: owner.id });

    await apiCall.post('/loyalty/programs', {
      name: `Programa E2E ${suffix}`,
      pointsPerReal: 1,
      redemptionRules: { minimumPoints: 50 }
    });
    await apiCall.post('/loyalty/points', {
      ownerId: owner.id,
      points: 180,
      sourceType: 'bonus',
      sourceId: `seed-${suffix}`
    });
    await apiCall.post('/loyalty/redemptions', {
      ownerId: owner.id,
      pointsUsed: 60,
      rewardDescription: `Brinde E2E ${suffix}`
    });

    const priceTable = await apiCall.post('/price-tables', {
      legacyId: `E2E-${suffix}`,
      description: `TABELA E2E ${suffix}`,
      context: 'Fluxo Vetus comercial E2E'
    });
    await apiCall.post(`/price-tables/${priceTable.id}/items`, {
      itemKind: 'service',
      itemId: `svc-e2e-${suffix}`,
      price: 199.9
    });

    const job = await apiCall.post('/pos-sync/jobs', {
      syncKind: 'stock',
      metadata: { source: 'e2e' }
    });
    await apiCall.patch(`/pos-sync/jobs/${job.id}`, {
      status: 'completed',
      processedCount: 7
    });

    await spaPage.goto('/loyalty');
    await expect(page.getByRole('heading', { name: /Resgate de Pontos|Fidelidade/i })).toBeVisible();
    await expect(page.getByText(`Brinde E2E ${suffix}`).first()).toBeVisible({ timeout: 15000 });

    await spaPage.goto('/tabelas-de-preco');
    await expect(page.getByRole('heading', { name: /Tabelas de Preço/i }).first()).toBeVisible();
    await expect(page.getByText(`TABELA E2E ${suffix}`)).toBeVisible({ timeout: 15000 });

    await spaPage.goto('/pontos-de-venda');
    await expect(page.getByRole('heading', { name: /Pontos de venda/i }).first()).toBeVisible();
    await expect(page.getByText(job.id)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Concluído')).toBeVisible();
  });
});
