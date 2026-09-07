import type { InjectionKey } from 'vue';

interface Participant {
  snapshot: () => string;
  confirm: () => boolean | Promise<boolean>;
  discard: (approvedSnapshot: string) => void;
}

/** Scoped to the mounted workspace. Holds callbacks, never durable personal data. */
export function createUnsavedChangesCoordinator() {
  const participants = new Set<Participant>();
  return {
    register(participant: Participant) {
      participants.add(participant);
      return () => { participants.delete(participant); };
    },
    async confirmAndDiscard() {
      const approvals = [...participants].map(participant => ({ participant, snapshot: participant.snapshot() }));
      for (const { participant } of approvals) {
        if (!await participant.confirm()) return false;
      }
      // A record or its values may change while another confirmation is pending.
      if (participants.size !== approvals.length || approvals.some(({ participant, snapshot }) =>
        !participants.has(participant) || participant.snapshot() !== snapshot
      )) return false;
      for (const { participant, snapshot } of approvals) participant.discard(snapshot);
      return true;
    }
  };
}

export const unsavedChangesCoordinatorKey: InjectionKey<ReturnType<typeof createUnsavedChangesCoordinator>> =
  Symbol('workspace-unsaved-changes');
