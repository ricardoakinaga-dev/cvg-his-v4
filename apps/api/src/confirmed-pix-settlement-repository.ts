/**
 * Compatibility shim: the confirmed PIX settlement repository is owned by
 * module-pix so API and worker consumers share exactly one implementation.
 */
export {
  DatabaseConfirmedPixSettlementRepository
} from '@cvg-his-v2/module-pix';
export type {
  ApplyConfirmedPixSettlementInput,
  ConfirmedPixProvider,
  ConfirmedPixSettlementCheckpoint,
  ConfirmedPixSettlementRecord,
  ConfirmedPixSettlementRepository,
  DatabaseConfirmedPixSettlementRepositoryOptions
} from '@cvg-his-v2/module-pix';
