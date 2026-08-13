import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';

type EncounterStatus = 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed';

export interface EncounterQueueSyncDependencies {
  encounters: EncountersService;
  scheduling: SchedulingService;
}

export type SyncQueueWithEncounter = (
  encounterId: string,
  status: EncounterStatus
) => Promise<void>;

export function createEncounterQueueSync(
  dependencies: EncounterQueueSyncDependencies
): SyncQueueWithEncounter {
  return async (encounterId, status) => {
    const encounter = dependencies.encounters.getOrThrow(encounterId as never);
    if (!encounter.queueEntryId || status === 'reception') {
      return;
    }
    if (status === 'closed') {
      await dependencies.scheduling.completeQueueEntry(encounter.queueEntryId);
      return;
    }
    const queueStatus =
      status === 'in_triage'
        ? 'in_triage'
        : status === 'in_care'
          ? 'in_care'
          : 'observation';
    await dependencies.scheduling.transitionQueueForEncounter(
      encounter.queueEntryId,
      queueStatus
    );
  };
}
