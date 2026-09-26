import type { IncomingMessage, ServerResponse } from 'node:http';

import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import type { EncounterCashReceiptRepository } from '../encounter-cash-receipt-repository.js';
import { matchesCollectionItemPath } from './resource-route-path.js';

export interface EncounterDeleteRoutesHandlers {
  readonly encounters: Pick<EncountersService, 'deleteEncounter' | 'waitForPersistence'>;
  readonly encounterCashReceiptRepository?: EncounterCashReceiptRepository;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly requireEncounterForAccount: (
    encounterId: string,
    accountId: string
  ) => ReturnType<EncountersService['getOrThrow']>;
  readonly assertEncounterHasNoCashReceipt: (
    repository: EncounterCashReceiptRepository,
    accountId: string,
    encounterId: string
  ) => Promise<void>;
  readonly appendAudit: (
    actorId: string,
    accountId: string,
    module: string,
    action: string,
    entityType: string,
    entityId: string,
    payloadSummary: string,
    riskLevel: 'low' | 'medium' | 'high',
    correlationId: string
  ) => void;
}

export async function handleEncounterDeleteRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: EncounterDeleteRoutesHandlers
): Promise<boolean> {
  const {
    encounters,
    encounterCashReceiptRepository,
    requirePrincipal,
    requireEncounterForAccount,
    assertEncounterHasNoCashReceipt,
    appendAudit
  } = handlers;

  if (matchesCollectionItemPath(pathname, '/encounters') && request.method === 'DELETE') {
    const principal = await requirePrincipal(request, 'encounters.manage');
    const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
    requireEncounterForAccount(encounterId, principal.user.accountId);
    if (encounterCashReceiptRepository) {
      await assertEncounterHasNoCashReceipt(
        encounterCashReceiptRepository,
        principal.user.accountId,
        encounterId
      );
    }
    encounters.deleteEncounter(principal.user.accountId, encounterId as never);
    await encounters.waitForPersistence();
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'encounters',
      'delete',
      'encounter',
      encounterId,
      `Encounter ${encounterId} deleted`,
      'high',
      correlationId
    );
    response.statusCode = 204;
    response.end();
    return true;
  }

  return false;
}
