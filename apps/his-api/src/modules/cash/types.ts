import {
  openCashRegisterBodySchema,
  closeCashRegisterBodySchema,
  cashRegisterIdParamSchema,
  createCashMovementBodySchema,
  listCashMovementsQuerySchema,
  type OpenCashRegisterBody,
  type CloseCashRegisterBody,
  type CreateCashMovementBody,
  type ListCashMovementsQuery,
  type CashRegisterStatus,
  type CashMovementType
} from '@cvg-his/contracts';

export {
  openCashRegisterBodySchema,
  closeCashRegisterBodySchema,
  cashRegisterIdParamSchema,
  createCashMovementBodySchema,
  listCashMovementsQuerySchema
};

export type {
  OpenCashRegisterBody,
  CloseCashRegisterBody,
  CreateCashMovementBody,
  ListCashMovementsQuery,
  CashRegisterStatus,
  CashMovementType
};
