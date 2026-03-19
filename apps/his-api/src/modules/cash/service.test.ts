import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCashService } from './service.js';

const mockCtx = {
  requestId: 'req-1',
  actor: { accountId: 'acc-1', userId: 'user-1', roles: ['admin'], permissions: [] }
} as any;

const baseRegister = {
  id: 'reg-1',
  accountId: 'acc-1',
  openedByUserId: 'user-1',
  openedByName: 'Admin',
  closedByUserId: null,
  closedByName: null,
  openingAmount: 100,
  closingAmount: null,
  expectedClosingAmount: null,
  difference: null,
  status: 'open',
  openedAt: new Date(),
  closedAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const baseMovement = {
  id: 'mov-1',
  cashRegisterId: 'reg-1',
  accountId: 'acc-1',
  movementType: 'opening',
  amount: 100,
  runningBalance: 100,
  reference: null,
  notes: null,
  createdByUserId: 'user-1',
  createdByName: 'Admin',
  createdAt: new Date()
};

describe('Cash Register Service', () => {
  let mockRepo: any;
  let mockAudit: any;
  let svc: ReturnType<typeof createCashService>;

  beforeEach(() => {
    mockRepo = {
      findOpenRegister: vi.fn().mockResolvedValue(null),
      findRegisterById: vi.fn().mockResolvedValue(baseRegister),
      listRegisters: vi.fn().mockResolvedValue({ data: [baseRegister], page: 1, pageSize: 20, total: 1 }),
      openRegister: vi.fn().mockResolvedValue(baseRegister),
      closeRegister: vi.fn().mockResolvedValue({ ...baseRegister, status: 'closed', closingAmount: 250 }),
      createMovement: vi.fn().mockResolvedValue(baseMovement),
      listMovements: vi.fn().mockResolvedValue({ data: [baseMovement], page: 1, pageSize: 50, total: 1 }),
      getSummary: vi.fn().mockResolvedValue({ totalPayments: 150, totalSupplies: 50, totalWithdrawals: 0 })
    };
    mockAudit = vi.fn().mockResolvedValue(undefined);
    svc = createCashService(
      { db: {} as any, requestContext: mockCtx },
      { repo: mockRepo, appendAudit: mockAudit }
    );
  });

  describe('open', () => {
    it('should open a new cash register', async () => {
      const result = await svc.open({ openingAmount: 100, notes: 'Início do dia' });
      expect(result.id).toBe('reg-1');
      expect(result.openingAmount).toBe(100);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'cashRegister.open' })
      );
    });

    it('should reject if register already open', async () => {
      mockRepo.findOpenRegister.mockResolvedValueOnce(baseRegister);
      await expect(svc.open({ openingAmount: 100 })).rejects.toThrow('already an open cash register');
    });
  });

  describe('close', () => {
    it('should close the open register', async () => {
      mockRepo.findOpenRegister.mockResolvedValueOnce(baseRegister);
      const result = await svc.close({ closingAmount: 250, notes: 'Fechamento do dia' });
      expect(result.status).toBe('closed');
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'cashRegister.close' })
      );
    });

    it('should reject if no register is open', async () => {
      await expect(svc.close({ closingAmount: 250 })).rejects.toThrow('No open cash register');
    });
  });

  describe('getOpenRegister', () => {
    it('should get current open register', async () => {
      mockRepo.findOpenRegister.mockResolvedValueOnce(baseRegister);
      const result = await svc.getOpenRegister();
      expect(result.status).toBe('open');
    });

    it('should return null if no register is open', async () => {
      const result = await svc.getOpenRegister();
      expect(result).toBeNull();
    });
  });

  describe('listRegisters', () => {
    it('should list registers', async () => {
      const result = await svc.listRegisters();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('createMovement', () => {
    it('should create a supply movement', async () => {
      mockRepo.listMovements.mockResolvedValueOnce({ data: [{ runningBalance: 100 }], total: 1 });
      const result = await svc.createMovement({
        cashRegisterId: 'reg-1',
        movementType: 'supply',
        amount: 50,
        notes: 'Suprimento'
      });
      expect(result.id).toBe('mov-1');
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'cashMovement.create' })
      );
    });

    it('should create a withdrawal movement', async () => {
      mockRepo.listMovements.mockResolvedValueOnce({ data: [{ runningBalance: 200 }], total: 1 });
      const result = await svc.createMovement({
        cashRegisterId: 'reg-1',
        movementType: 'withdrawal',
        amount: 50,
        notes: 'Sangria'
      });
      expect(result.id).toBe('mov-1');
    });

    it('should reject movement on closed register', async () => {
      mockRepo.findRegisterById.mockResolvedValueOnce({ ...baseRegister, status: 'closed' });
      await expect(
        svc.createMovement({ cashRegisterId: 'reg-1', movementType: 'supply', amount: 50 })
      ).rejects.toThrow('Cash register is closed');
    });
  });

  describe('listMovements', () => {
    it('should list movements', async () => {
      const result = await svc.listMovements({});
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getSummary', () => {
    it('should get register summary', async () => {
      const result = await svc.getSummary('reg-1');
      expect(result.registerId).toBe('reg-1');
      expect(result.totalPayments).toBe(150);
    });

    it('should return null for non-existent register', async () => {
      mockRepo.findRegisterById.mockResolvedValueOnce(null);
      const result = await svc.getSummary('nonexistent');
      expect(result).toBeNull();
    });
  });
});
