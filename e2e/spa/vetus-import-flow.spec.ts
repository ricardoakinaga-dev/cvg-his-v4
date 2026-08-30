import { expect, test } from './fixtures/spa-fixture';

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

test.describe('Importação Assistida Vetus — fluxo de revisão e persistência', () => {
  test('valida, executa e desfaz um lote persistido pela interface', async ({
    page,
    spaPage,
    apiCall
  }) => {
    const suffix = uniqueSuffix();
    const sourceReference = `browser-import-${suffix}`;
    const ownerName = `Tutor Browser Vetus ${suffix}`;
    const patientName = `Paciente Browser Vetus ${suffix}`;
    const row = [
      `VET-${suffix}`,
      ownerName,
      '(11) 99999-0000',
      `browser-${suffix}@example.com`,
      `PET-${suffix}`,
      patientName,
      'Canina',
      'SRD',
      'Femea',
      '12,4',
      'Historico de importacao assistida',
      sourceReference,
      'Revisor Browser'
    ].join(';');
    const csv = [
      'ID Cliente Vetus;Cliente;Telefone;Email;ID Animal Vetus;Animal;Especie;Raca;Sexo;Peso;Historico;Origem;Revisor',
      row
    ].join('\n');
    let batchId: string | undefined;
    let importCompleted = false;
    let rolledBack = false;
    let importedOwnerId: string | undefined;
    let importedPatientId: string | undefined;

    try {
      await spaPage.goto('/vetus-imports');
      await expect(page.getByRole('heading', { name: 'Importação Assistida Vetus' })).toBeVisible();

      await page.getByLabel('Dados').fill(csv);
      await page.getByRole('button', { name: 'Validar', exact: true }).click();
      await expect(page.getByText(ownerName)).toBeVisible();
      await expect(page.getByText(patientName)).toBeVisible();
      await expect(page.getByText('Pronto', { exact: true })).toBeVisible();

      const dryRunResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/vetus-import-batches') &&
          response.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Dry-run', exact: true }).click();
      const dryRun = await (await dryRunResponse).json();
      batchId = dryRun.batch?.id;
      expect(batchId).toEqual(expect.any(String));
      await expect(page.getByText('Dry-run concluído', { exact: true })).toBeVisible();
      await expect(
        page.getByText('1 registro(s) validados no dry-run.', { exact: true })
      ).toBeVisible();

      const importResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/vetus-import-batches') &&
          response.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Importar', exact: true }).click();
      const imported = await (await importResponse).json();
      batchId = imported.batch?.id ?? batchId;
      expect(imported.batch?.status).toBe('completed');
      importCompleted = true;
      const importedItem = imported.items?.[0];
      expect(importedItem?.ownerId).toEqual(expect.any(String));
      expect(importedItem?.patientId).toEqual(expect.any(String));
      if (
        typeof importedItem?.ownerId !== 'string' ||
        typeof importedItem?.patientId !== 'string'
      ) {
        throw new Error(
          'Vetus browser import did not return persisted owner and patient identifiers'
        );
      }
      importedOwnerId = importedItem.ownerId;
      importedPatientId = importedItem.patientId;
      await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
      await expect(page.getByText('1 registro(s) processado(s).', { exact: true })).toBeVisible();

      const owners = await apiCall.get('/owners');
      const patients = await apiCall.get('/patients');
      expect(owners.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ fullName: ownerName })])
      );
      expect(patients.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: patientName })])
      );

      const rollbackResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/vetus-import-batches/${batchId}/rollback`) &&
          response.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Desfazer lote', exact: true }).click();
      const rollback = await (await rollbackResponse).json();
      expect(rollback.batch?.status).toBe('rolled_back');
      rolledBack = true;
      await expect(
        page.getByText('Lote revertido. Registros criados pelo lote foram inativados.', {
          exact: true
        })
      ).toBeVisible();
      await expect(page.getByText('Revertido', { exact: true })).toBeVisible();
      if (!importedOwnerId || !importedPatientId) {
        throw new Error('Vetus browser rollback proof is missing persisted domain identifiers');
      }
      const rolledBackOwner = await apiCall.get(`/owners/${encodeURIComponent(importedOwnerId)}`);
      const rolledBackPatient = await apiCall.get(
        `/patients/${encodeURIComponent(importedPatientId)}`
      );
      expect(rolledBackOwner.status).toBe('inactive');
      expect(rolledBackPatient.status).toBe('inactive');
    } finally {
      if (batchId && importCompleted && !rolledBack) {
        try {
          await apiCall.post(`/vetus-import-batches/${encodeURIComponent(batchId)}/rollback`, {});
        } catch {
          // The browser flow may already have rolled the batch back.
        }
      }
    }
  });
});
