import type { IncomingMessage } from 'node:http';

import type {
  AbacEngine,
  AccessControlService,
  ActorAttributes,
  EnvironmentAttributes,
  ResourceAttributes
} from '@cvg-his-v2/module-access-control';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

export interface AbacEnforcerDependencies {
  accessControl: AccessControlService;
  abacEngine: AbacEngine;
}

export type EnforceAbac = (
  actionCode: string,
  principal: AuthenticatedPrincipal,
  resource: ResourceAttributes,
  request: IncomingMessage
) => void;

function buildActorAttributes(
  accessControl: AccessControlService,
  principal: AuthenticatedPrincipal,
  request: IncomingMessage
): ActorAttributes {
  const memberships = accessControl.listMemberships(principal.user.id as never);
  const branchIdHeader = request.headers['x-branch-id'];
  const branchIds =
    typeof branchIdHeader === 'string' && branchIdHeader.trim().length > 0
      ? [branchIdHeader.trim()]
      : [];
  return {
    userId: principal.user.id as never,
    accountId: principal.user.accountId as never,
    roleCodes: principal.access.roleCodes,
    department: undefined,
    jobTitle: undefined,
    staffId: undefined,
    branchIds,
    teamIds: memberships.teams.map((team) => team.id),
    sectorIds: memberships.sectors.map((sector) => sector.id),
    sectorCodes: memberships.sectors.map((sector) => sector.code),
    isActive: principal.user.status === 'active'
  };
}

function buildEnvironmentAttributes(request: IncomingMessage): EnvironmentAttributes {
  const now = new Date();
  return {
    timestamp: now.toISOString(),
    dayOfWeek: now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    hourOfDay: now.getHours(),
    ipAddress:
      request.headers['x-forwarded-for']?.toString().split(',')[0].trim() ??
      request.socket.remoteAddress,
    userAgent: request.headers['user-agent']
  };
}

export function createAbacEnforcer(
  dependencies: AbacEnforcerDependencies
): EnforceAbac {
  return (actionCode, principal, resource, request) => {
    dependencies.abacEngine.enforce(
      actionCode,
      buildActorAttributes(dependencies.accessControl, principal, request),
      resource,
      buildEnvironmentAttributes(request)
    );
  };
}
