import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseFinanceCatalogRepository } from '../../../apps/api/src/repositories/database-finance-catalog.repository.ts';
import { DatabaseAccessControlRepository } from '../../../packages/modules/access-control/src/repositories/database-access-control.repository.ts';
import {
  DatabaseCounterSalesRepository,
  type CounterSaleItemRecord,
  type CounterSaleRecord
} from '../../../packages/modules/counter-sales/src/repositories/database-counter-sales.repository.ts';
import { DatabaseLaboratoryCatalogRepository } from '../../../packages/modules/diagnostics/src/repositories/database-laboratory-catalog.repository.ts';
import type {
  EncounterFinancialAccountRecord,
  EncounterReceivableRecord,
  FinancialPayableRecord
} from '../../../packages/modules/financial/src/index.ts';
import {
  DatabaseEncounterFinancialRepository,
  DatabaseFinancialPayablesRepository
} from '../../../packages/modules/financial/src/repositories/database-financial.repository.ts';
import {
  closeDatabaseClient,
  createDatabaseClient,
  getDatabaseClient
} from '../../../packages/shared/database/src/index.ts';
import type {
  AccountId,
  EncounterId,
  PermissionId,
  RoleId,
  UserId
} from '../../../packages/shared/types/src/index.ts';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.ts';
import { TEST_DB_URL } from '../../setup/env.ts';

const tenantId = randomUUID();
const accountId = randomUUID() as AccountId;
const userId = randomUUID() as UserId;
const ownerId = randomUUID();
const patientId = randomUUID();
const encounterId = randomUUID() as EncounterId;

function inTenant<T>(operation: () => T): T {
  return runWithTenantContext(
    {
      tenantId,
      accountId,
      userId,
      correlationId: `enterprise-repositories-${randomUUID()}`
    },
    operation
  );
}

describe('enterprise PostgreSQL repository contracts', () => {
  beforeAll(async () => {
    await closeDatabaseClient();
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query(
        `INSERT INTO tenants (id, slug, name, status)
         VALUES ($1, $2, 'Enterprise repositories tenant', 'active')`,
        [tenantId, `enterprise-repositories-${process.pid}`]
      );
      await admin.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, $2, $3, 'Enterprise repositories account')`,
        [accountId, tenantId, `enterprise-repositories-account-${process.pid}`]
      );
      await admin.query(
        `INSERT INTO users (id, account_id, email, password_hash, full_name)
         VALUES ($1, $2, $3, 'integration-password-hash', 'Enterprise User')`,
        [userId, accountId, `enterprise-repositories-${process.pid}@example.test`]
      );
      await admin.query(
        `INSERT INTO owners (id, account_id, full_name, email)
         VALUES ($1, $2, 'Enterprise Owner', $3)`,
        [ownerId, accountId, `enterprise-owner-${process.pid}@example.test`]
      );
      await admin.query(
        `INSERT INTO patients (id, account_id, owner_id, name, species)
         VALUES ($1, $2, $3, 'Enterprise Patient', 'canine')`,
        [patientId, accountId, ownerId]
      );
      await admin.query(
        `INSERT INTO encounters (
           id, account_id, patient_id, owner_id, opened_by_user_id, reason
         ) VALUES ($1, $2, $3, $4, $5, 'Enterprise repository contract')`,
        [encounterId, accountId, patientId, ownerId, userId]
      );
      await admin.query(
        `INSERT INTO inventory_items (
           id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
           unit_cost_amount, created_at, updated_at
         ) VALUES (
           $1, $2, 'LOW-STOCK-ENTERPRISE', 'Low stock enterprise item', 'unit',
           1, 5, 12.50, NOW(), NOW()
         )`,
        [`inventory-${randomUUID()}`, accountId]
      );
    } finally {
      await admin.end();
    }

    createDatabaseClient(TEST_DB_URL);
  });

  afterAll(async () => {
    await closeDatabaseClient();
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query('DELETE FROM accounts WHERE id = $1', [accountId]);
      await admin.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
      await admin.query('DELETE FROM roles WHERE name LIKE $1', [
        `enterprise_role_${process.pid}`
      ]);
      await admin.query('DELETE FROM permissions WHERE key LIKE $1', [
        `enterprise.permission.${process.pid}`
      ]);
    } finally {
      await admin.end();
    }
  });

  it('persists the complete counter-sale lifecycle and operational aggregates', async () => {
    await inTenant(async () => {
      const repository = new DatabaseCounterSalesRepository();
      const now = new Date().toISOString();
      const saleId = `counter-sale-${randomUUID()}`;
      const sale: CounterSaleRecord = {
        id: saleId,
        accountId,
        number: `PDV-${process.pid}`,
        ownerId,
        status: 'open',
        subtotal: 150,
        discountAmount: 10,
        total: 140,
        paidAmount: 0,
        balanceDue: 140,
        notes: 'Enterprise counter sale',
        openedByUserId: userId,
        closedByUserId: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now
      };
      await repository.create(sale);
      expect(await repository.findById(saleId)).toMatchObject({ status: 'open', total: 140 });
      expect(await repository.findById(`missing-${randomUUID()}`)).toBeNull();
      expect(
        await repository.findByAccountId(accountId, {
          status: 'open',
          ownerId,
          search: 'Enterprise'
        })
      ).toHaveLength(1);

      const productItem: CounterSaleItemRecord = {
        id: `counter-item-${randomUUID()}`,
        counterSaleId: saleId,
        accountId,
        itemType: 'product',
        catalogItemId: null,
        nameSnapshot: 'Enterprise Product',
        codeSnapshot: 'ENT-PROD',
        unitPrice: 50,
        quantity: 2,
        discountAmount: 5,
        lineTotal: 95,
        notes: null,
        createdAt: now,
        updatedAt: now
      };
      const serviceItem: CounterSaleItemRecord = {
        ...productItem,
        id: `counter-item-${randomUUID()}`,
        itemType: 'service',
        nameSnapshot: 'Enterprise Service',
        codeSnapshot: 'ENT-SVC',
        unitPrice: 45,
        quantity: 1,
        discountAmount: 0,
        lineTotal: 45
      };
      await repository.createItem(productItem);
      await repository.createItem(serviceItem);
      await repository.updateItem({
        ...productItem,
        quantity: 3,
        discountAmount: 10,
        lineTotal: 140,
        notes: 'Quantity reviewed',
        updatedAt: new Date().toISOString()
      });
      expect(await repository.findItemsBySaleId(saleId)).toHaveLength(2);

      await repository.createPayment({
        id: `counter-payment-${randomUUID()}`,
        counterSaleId: saleId,
        accountId,
        method: 'pix',
        amount: 140,
        installments: 1,
        reference: 'pix-enterprise-contract',
        notes: null,
        createdAt: now
      });
      expect(await repository.findPaymentsBySaleId(saleId)).toEqual([
        expect.objectContaining({ method: 'pix', amount: 140 })
      ]);

      const closedAt = new Date().toISOString();
      await repository.update({
        ...sale,
        status: 'closed',
        paidAmount: 140,
        balanceDue: 0,
        closedByUserId: userId,
        closedAt,
        updatedAt: closedAt
      });
      expect(await repository.getOpenSalesCount(accountId)).toBe(0);
      expect(await repository.getClosedTodayCount(accountId)).toBe(1);
      expect(await repository.getRevenueToday(accountId)).toEqual({ gross: 140, net: 140 });
      expect(
        await repository.getSalesByPaymentMethod(accountId, '2026-01-01', '2027-01-01')
      ).toEqual([expect.objectContaining({ method: 'pix', total: 140 })]);
      expect(await repository.getTopProducts(accountId, '2026-01-01', '2027-01-01', 5)).toEqual([
        expect.objectContaining({ name: 'Enterprise Product', quantity: 3, revenue: 140 })
      ]);
      expect(await repository.getTopServices(accountId, '2026-01-01', '2027-01-01', 5)).toEqual([
        expect.objectContaining({ name: 'Enterprise Service', quantity: 1, revenue: 45 })
      ]);
      expect(await repository.getLowStockAlerts(accountId)).toContainEqual({
        name: 'Low stock enterprise item',
        code: 'LOW-STOCK-ENTERPRISE',
        onHand: 1,
        reorderLevel: 5
      });

      await repository.deleteItem(serviceItem.id);
      expect(await repository.findItemsBySaleId(saleId)).toHaveLength(1);
    });
  });

  it('persists encounter receivables, payments and payables through updates', async () => {
    await inTenant(async () => {
      const encounterRepository = new DatabaseEncounterFinancialRepository();
      const payableRepository = new DatabaseFinancialPayablesRepository();
      const now = new Date().toISOString();
      const financialAccountId = randomUUID();
      const financialAccount: EncounterFinancialAccountRecord = {
        id: financialAccountId,
        accountId,
        encounterId,
        financialStatus: 'pending',
        subtotalSnapshot: 200,
        discountTotalSnapshot: 20,
        totalSnapshot: 180,
        paidAmount: 0,
        balanceDue: 180,
        closedByUserId: null,
        closedAt: null,
        notes: 'Enterprise financial account',
        snapshotJson: JSON.stringify({ source: 'integration' }),
        createdAt: now,
        updatedAt: now
      };
      expect(await encounterRepository.findFinancialAccountByEncounter(encounterId)).toBeNull();
      await encounterRepository.upsertFinancialAccount(financialAccount);
      await encounterRepository.upsertFinancialAccount({
        ...financialAccount,
        financialStatus: 'partial',
        paidAmount: 80,
        balanceDue: 100,
        updatedAt: new Date().toISOString()
      });
      expect(await encounterRepository.findFinancialAccountByEncounter(encounterId)).toMatchObject({
        financialStatus: 'partial',
        paidAmount: 80,
        balanceDue: 100
      });

      const receivable: EncounterReceivableRecord = {
        id: randomUUID(),
        accountId,
        encounterId,
        financialAccountId,
        installmentNumber: 1,
        installmentLabel: 'Parcela única',
        dueAt: '2026-08-20T12:00:00.000Z',
        status: 'open',
        amountOriginal: 180,
        amountPaid: 80,
        amountOutstanding: 100,
        issuedAt: now,
        settledAt: null,
        notes: null,
        createdAt: now,
        updatedAt: now
      };
      await encounterRepository.replaceReceivables(financialAccountId, [receivable]);
      expect(await encounterRepository.listReceivablesByFinancialAccount(financialAccountId)).toHaveLength(1);
      expect(await encounterRepository.findReceivableById(receivable.id)).toMatchObject({
        status: 'open',
        amountOutstanding: 100
      });
      expect(await encounterRepository.findReceivableById(randomUUID())).toBeNull();
      expect(
        await encounterRepository.listReceivables({ accountId, status: 'open', encounterId })
      ).toHaveLength(1);
      expect(await encounterRepository.listReceivables()).toHaveLength(1);

      await encounterRepository.createPayment({
        id: randomUUID(),
        accountId,
        encounterId,
        financialAccountId,
        receivableId: receivable.id,
        amountPaid: 100,
        paidAt: now,
        paidByUserId: userId,
        externalReferenceType: 'pix_transaction',
        externalReferenceId: 'pix-enterprise-receivable',
        notes: 'Settled through integration contract',
        createdAt: now
      });
      expect(await encounterRepository.listPaymentsByFinancialAccount(financialAccountId)).toEqual([
        expect.objectContaining({ amountPaid: 100, externalReferenceType: 'pix_transaction' })
      ]);
      await encounterRepository.updateReceivable({
        ...receivable,
        status: 'settled',
        amountPaid: 180,
        amountOutstanding: 0,
        settledAt: now,
        updatedAt: now
      });
      expect(await encounterRepository.findReceivableById(receivable.id)).toMatchObject({
        status: 'settled',
        amountOutstanding: 0
      });

      const payableId = `payable-${randomUUID()}`;
      const payable: FinancialPayableRecord = {
        id: payableId,
        accountId,
        supplierName: 'Enterprise Supplier',
        description: 'PostgreSQL persistence contract',
        category: 'Tecnologia',
        costCenterCode: 'CC-ENT',
        costCenterName: 'Enterprise Center',
        issuedAt: '2026-08-01',
        dueAt: '2026-08-30',
        totalAmount: 500,
        paidAmount: 0,
        outstandingAmount: 500,
        status: 'open',
        sourceExpenseId: null,
        notes: null,
        paymentMethod: null,
        paymentReference: null,
        reconciliationStatus: 'not_required',
        reconciliationReference: null,
        createdByUserId: userId,
        paidByUserId: null,
        cancelledByUserId: null,
        reconciledByUserId: null,
        createdAt: now,
        updatedAt: now,
        paidAt: null,
        cancelledAt: null,
        reconciledAt: null
      };
      expect(await payableRepository.findPayableById(`missing-${randomUUID()}`)).toBeNull();
      await payableRepository.savePayable(payable);
      expect(await payableRepository.listPayables({ accountId, status: 'open' })).toHaveLength(1);
      await payableRepository.updatePayable({
        ...payable,
        paidAmount: 500,
        outstandingAmount: 0,
        status: 'paid',
        paymentMethod: 'pix',
        paymentReference: 'pix-enterprise-payable',
        reconciliationStatus: 'reconciled',
        reconciliationReference: 'bank-statement-enterprise',
        paidByUserId: userId,
        reconciledByUserId: userId,
        updatedAt: now,
        paidAt: now,
        reconciledAt: now
      });
      expect(await payableRepository.findPayableById(payableId)).toMatchObject({
        status: 'paid',
        outstandingAmount: 0,
        reconciliationStatus: 'reconciled'
      });
      expect(await payableRepository.listPayables()).toHaveLength(1);
    });
  });

  it('persists RBAC, teams, sectors, memberships and assignment effects', async () => {
    await inTenant(async () => {
      const repository = new DatabaseAccessControlRepository();
      const roleId = randomUUID() as RoleId;
      const permissionId = randomUUID() as PermissionId;
      const now = new Date().toISOString();
      const roleCode = `enterprise_role_${process.pid}`;
      const permissionCode = `enterprise.permission.${process.pid}`;

      expect(await repository.findRoleById(roleId)).toBeNull();
      expect(await repository.findPermissionByKey(permissionCode)).toBeNull();
      await repository.createRole({
        id: roleId,
        code: roleCode,
        name: 'Enterprise Role',
        description: 'Enterprise RBAC persistence contract',
        createdAt: now,
        permissionCodes: []
      });
      await repository.createPermission({
        id: permissionId,
        key: permissionCode,
        description: 'Enterprise permission contract',
        createdAt: now
      });
      await repository.addPermissionToRole(roleId, permissionId);
      await repository.assignRoleToUser(userId, roleId);
      expect(await repository.findRoleByName(roleCode)).toMatchObject({ id: roleId });
      expect(await repository.findPermissionsByRole(roleId)).toEqual([
        expect.objectContaining({ id: permissionId, key: permissionCode })
      ]);
      expect(await repository.findRolesByUser(userId)).toEqual([
        expect.objectContaining({ id: roleId, permissionCodes: [permissionCode] })
      ]);
      expect(await repository.findAllRoles()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: roleId })])
      );
      expect(await repository.findAllPermissions()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: permissionId })])
      );

      const team = await repository.createTeam({
        accountId,
        code: `TEAM-${process.pid}`,
        name: 'Enterprise Team',
        description: 'Team persistence contract'
      });
      const sector = await repository.createSector({
        accountId,
        code: `SECTOR-${process.pid}`,
        name: 'Enterprise Sector',
        description: 'Sector persistence contract'
      });
      expect(
        await repository.updateTeam(team.id, {
          name: 'Enterprise Team Updated',
          description: null,
          isActive: false
        })
      ).toMatchObject({ name: 'Enterprise Team Updated', status: 'inactive' });
      expect(
        await repository.updateSector(sector.id, {
          code: `SECTOR-UPDATED-${process.pid}`,
          isActive: false
        })
      ).toMatchObject({ status: 'inactive' });
      expect(await repository.findAllTeams(accountId)).toHaveLength(1);
      expect(await repository.findAllSectors(accountId)).toHaveLength(1);

      await repository.replaceUserTeams(userId, [team.id]);
      await repository.replaceUserSectors(userId, [sector.id]);
      expect(await repository.findTeamMemberships(accountId)).toEqual([
        expect.objectContaining({ userId, subjectType: 'team', subjectId: team.id })
      ]);
      expect(await repository.findSectorMemberships(accountId)).toEqual([
        expect.objectContaining({ userId, subjectType: 'sector', subjectId: sector.id })
      ]);

      await repository.upsertPermissionAssignment({
        accountId,
        subjectType: 'user',
        subjectId: userId,
        permissionCode,
        effect: 'allow'
      });
      await repository.upsertPermissionAssignment({
        accountId,
        subjectType: 'team',
        subjectId: team.id,
        permissionCode,
        effect: 'deny'
      });
      await repository.upsertPermissionAssignment({
        accountId,
        subjectType: 'sector',
        subjectId: sector.id,
        permissionCode,
        effect: 'allow'
      });
      expect(await repository.findPermissionAssignments(accountId)).toHaveLength(3);
      await repository.removePermissionAssignment({
        subjectType: 'user',
        subjectId: userId,
        permissionCode
      });
      await repository.removePermissionAssignment({
        subjectType: 'team',
        subjectId: team.id,
        permissionCode
      });
      await repository.removePermissionAssignment({
        subjectType: 'sector',
        subjectId: sector.id,
        permissionCode
      });
      expect(await repository.findPermissionAssignments(accountId)).toHaveLength(0);
      await repository.replaceUserTeams(userId, []);
      await repository.replaceUserSectors(userId, []);
      await repository.removeRoleFromUser(userId, roleId);
      await repository.removePermissionFromRole(roleId, permissionId);
      expect(await repository.findRolesByUser(userId)).toHaveLength(0);
    });
  });

  it('persists laboratory catalog seed and custom CRUD with tenant-scoped reads', async () => {
    await inTenant(async () => {
      const repository = new DatabaseLaboratoryCatalogRepository(getDatabaseClient());
      await repository.ensureSeedData(accountId);
      await repository.ensureSeedData(accountId);
      expect((await repository.listEquipment(accountId)).length).toBeGreaterThan(0);
      expect((await repository.listReportTypes(accountId)).length).toBeGreaterThan(0);
      expect((await repository.listReferenceValues(accountId)).length).toBeGreaterThan(0);

      const equipment = await repository.createEquipment(accountId, {
        name: 'Enterprise Analyzer',
        type: 'hematology',
        serialNumber: `LAB-${process.pid}`,
        status: 'active',
        lastCalibrationAt: '2026-08-01T10:00:00.000Z'
      });
      expect(
        await repository.updateEquipment(accountId, equipment.id, {
          name: 'Enterprise Analyzer Updated',
          status: 'maintenance'
        })
      ).toMatchObject({ name: 'Enterprise Analyzer Updated', status: 'maintenance' });
      expect(await repository.getEquipment(accountId, `missing-${randomUUID()}`)).toBeUndefined();
      await expect(
        repository.updateEquipment(accountId, `missing-${randomUUID()}`, { status: 'inactive' })
      ).rejects.toThrow('Laboratory equipment not found');

      const reportType = await repository.createReportType(accountId, {
        name: 'Enterprise Report',
        code: `ENT-${process.pid}`,
        category: 'hematology',
        description: 'Enterprise laboratory report',
        active: true
      });
      expect(
        await repository.updateReportType(accountId, reportType.id, {
          description: 'Enterprise laboratory report updated',
          active: false
        })
      ).toMatchObject({ active: false });
      expect(await repository.getReportType(accountId, `missing-${randomUUID()}`)).toBeUndefined();
      await expect(
        repository.updateReportType(accountId, `missing-${randomUUID()}`, { active: false })
      ).rejects.toThrow('Laboratory report type not found');

      const referenceValue = await repository.createReferenceValue(accountId, {
        parameter: 'Enterprise Hematocrit',
        examType: 'hematology',
        minValue: 35,
        maxValue: 55,
        unit: '%'
      });
      expect(await repository.listReferenceValues(accountId, 'hematology')).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: referenceValue.id })])
      );
      expect(
        await repository.updateReferenceValue(accountId, referenceValue.id, {
          minValue: 36,
          maxValue: 54
        })
      ).toMatchObject({ minValue: 36, maxValue: 54 });
      await expect(
        repository.updateReferenceValue(accountId, referenceValue.id, {
          minValue: 60,
          maxValue: 50
        })
      ).rejects.toThrow('minimum cannot be greater than maximum');
      await expect(
        repository.updateReferenceValue(accountId, `missing-${randomUUID()}`, { minValue: 1 })
      ).rejects.toThrow('Laboratory reference value not found');
    });
  });

  it('persists finance catalogs with filtering, renaming and in-use protection', async () => {
    await inTenant(async () => {
      const repository = new DatabaseFinanceCatalogRepository();
      expect(repository.isValidCategory('Tecnologia')).toBe(true);
      expect(repository.isValidCategory('Categoria inventada')).toBe(false);

      const center = await repository.createCostCenter(accountId, {
        code: `CC-ENT-${process.pid}`,
        name: 'Enterprise Cost Center',
        kind: 'Operacional',
        owner: 'Enterprise Operations',
        description: 'Enterprise finance catalog contract'
      });
      expect(
        await repository.listCostCenters(accountId, {
          search: 'Enterprise',
          kind: 'operacional',
          sort: 'code',
          order: 'desc',
          page: 99,
          pageSize: 1
        })
      ).toMatchObject({ totalItems: 1, page: 1, pageSize: 1, order: 'desc' });

      const expense = await repository.create(accountId, userId, {
        name: 'Enterprise Infrastructure',
        kind: 'Despesa operacional',
        category: 'Tecnologia',
        costCenterCode: center.code,
        description: 'Enterprise expense catalog contract'
      });
      expect(
        await repository.list(accountId, {
          search: 'Infrastructure',
          category: 'tecnologia',
          costCenterCode: center.code,
          sort: 'category',
          order: 'desc',
          page: -1,
          pageSize: 500
        })
      ).toMatchObject({ totalItems: 1, page: 1, pageSize: 100, order: 'desc' });
      await expect(repository.removeCostCenter(accountId, center.code)).rejects.toThrow(
        'COST_CENTER_IN_USE'
      );

      const renamedCode = `CC-ENT-UPDATED-${process.pid}`;
      const updatedCenter = await repository.updateCostCenter(accountId, center.code, {
        code: renamedCode,
        name: 'Enterprise Cost Center Updated',
        kind: 'Administrativo',
        owner: 'Enterprise Finance',
        description: 'Enterprise finance catalog contract updated'
      });
      expect(updatedCenter.diffSummary).toContain('code:');
      const updatedExpense = await repository.update(accountId, expense.id, {
        name: 'Enterprise Infrastructure Updated',
        kind: 'Despesa administrativa',
        category: 'Infraestrutura',
        costCenterCode: renamedCode,
        description: 'Enterprise expense catalog contract updated'
      });
      expect(updatedExpense.diffSummary).toContain('name:');

      await expect(
        repository.update(accountId, `missing-${randomUUID()}`, {
          name: 'Missing',
          kind: 'Missing',
          category: 'Tecnologia',
          costCenterCode: renamedCode,
          description: 'Missing'
        })
      ).rejects.toThrow('NOT_FOUND');
      await expect(repository.remove(accountId, `missing-${randomUUID()}`)).rejects.toThrow(
        'NOT_FOUND'
      );
      expect(await repository.remove(accountId, expense.id)).toMatchObject({ id: expense.id });
      expect(await repository.removeCostCenter(accountId, renamedCode)).toMatchObject({
        code: renamedCode
      });
      await expect(repository.removeCostCenter(accountId, renamedCode)).rejects.toThrow('NOT_FOUND');
    });
  });
});
