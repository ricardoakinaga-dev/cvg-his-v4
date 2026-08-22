import { describe, expect, it } from 'vitest';

import {
  ConfirmedPixSettlementCommand as ApiConfirmedPixSettlementCommand
} from '../../../apps/api/src/commands/confirmed-pix-settlement.js';
import {
  DatabaseConfirmedPixSettlementRepository as ApiDatabaseConfirmedPixSettlementRepository
} from '../../../apps/api/src/confirmed-pix-settlement-repository.js';
import {
  ConfirmedPixSettlementCommand,
  DatabaseConfirmedPixSettlementRepository
} from '@cvg-his-v2/module-pix';

describe('CVG-002B2B application boundaries', () => {
  it('keeps API compatibility shims pointed at the single module-pix implementation', () => {
    expect(ApiConfirmedPixSettlementCommand).toBe(ConfirmedPixSettlementCommand);
    expect(ApiDatabaseConfirmedPixSettlementRepository)
      .toBe(DatabaseConfirmedPixSettlementRepository);
  });
});
