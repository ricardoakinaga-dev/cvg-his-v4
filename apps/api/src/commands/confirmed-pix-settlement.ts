/**
 * Compatibility shim: the confirmed PIX settlement command is owned by
 * module-pix so API and worker consumers share exactly one implementation.
 */
export {
  ConfirmedPixSettlementCommand
} from '@cvg-his-v2/module-pix';
export type {
  ConfirmedPixSettlementCommandOptions
} from '@cvg-his-v2/module-pix';
