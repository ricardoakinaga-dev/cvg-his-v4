import { computeMedicationSlots, computeNextDueSlot } from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import { resolveMedicationScheduleTimezone } from '../medicationSchedules/timezone.js';
import { createMedicationDosesRepo, type MedicationDosesRepo } from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: MedicationDosesRepo;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type DueDoseItem = {
  orderId: string;
  stayId: string | null;
  encounterId: string | null;
  timezone: string;
  patient: {
    id: string;
    name: string;
  };
  medication: {
    name: string;
    doseValue: string;
    doseUnit: string;
    route: string;
    frequencyType: string;
  };
  scheduledFor: string;
  nextDueAt: string;
};

export type GetDueDosesResult = {
  now: string;
  windowMin: number;
  overdue: DueDoseItem[];
  upcoming: DueDoseItem[];
  total: number;
};

function unauthorizedError(message: string): Error & { statusCode: 401; code: 'UNAUTHORIZED' } {
  const error = new Error(message) as Error & {
    statusCode: 401;
    code: 'UNAUTHORIZED';
  };

  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

function ensureAccountActor(requestContext: RequestContext): AccountActor {
  const actor = requestContext.actor;

  if (!actor?.accountId) {
    throw unauthorizedError('Missing actor context. Provide x-account-id header.');
  }

  return actor as AccountActor;
}

function slotKey(orderId: string, scheduledFor: Date): string {
  return `${orderId}:${scheduledFor.getTime()}`;
}

function isWithinWindow(date: Date, from: Date, to: Date): boolean {
  const value = date.getTime();
  return value >= from.getTime() && value <= to.getTime();
}

function sortByScheduledForAsc(left: DueDoseItem, right: DueDoseItem): number {
  return new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime();
}

export function createMedicationDosesService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createMedicationDosesRepo(context.db);

  return {
    async getDue(input: { stayId?: string; windowMin: number }): Promise<GetDueDosesResult> {
      const actor = ensureAccountActor(context.requestContext);
      const now = new Date();
      const windowMs = input.windowMin * 60_000;
      const from = new Date(now.getTime() - windowMs);
      const to = new Date(now.getTime() + windowMs);

      const schedules = await repo.listActiveOrderSchedules(actor.accountId, input.stayId);
      if (schedules.length === 0) {
        return {
          now: now.toISOString(),
          windowMin: input.windowMin,
          overdue: [],
          upcoming: [],
          total: 0
        };
      }

      const orderIds = Array.from(new Set(schedules.map((item) => item.orderId)));
      const [lastByOrderId, administrationRows] = await Promise.all([
        repo.listLastScheduledForByOrderIds(actor.accountId, orderIds),
        repo.listAdministrationRowsInWindow(actor.accountId, orderIds, from, to)
      ]);

      const administeredSlots = new Set(
        administrationRows
          .filter((item) => item.status === 'administered')
          .map((item) => slotKey(item.orderId, item.scheduledFor))
      );
      const delayedByOriginalSlot = new Map<string, Date>();
      const delayedByOrderId = new Map<string, Date[]>();
      for (const row of administrationRows) {
        if (row.status !== 'delayed' || !row.delayedUntil) {
          continue;
        }

        delayedByOriginalSlot.set(slotKey(row.orderId, row.scheduledFor), row.delayedUntil);

        const byOrder = delayedByOrderId.get(row.orderId) ?? [];
        byOrder.push(row.delayedUntil);
        delayedByOrderId.set(row.orderId, byOrder);
      }

      const overdue: DueDoseItem[] = [];
      const upcoming: DueDoseItem[] = [];
      const refreshNextDueTasks: Promise<void>[] = [];

      for (const item of schedules) {
        const lastScheduledFor = lastByOrderId.get(item.orderId) ?? null;
        const timezone = resolveMedicationScheduleTimezone({
          accountId: actor.accountId,
          wardId: item.wardId
        });
        const schedule = {
          scheduleType: item.scheduleType,
          intervalMinutes: item.intervalMinutes,
          times: item.times,
          orderStartAt: item.orderStartAt,
          orderEndAt: item.orderEndAt,
          lastScheduledFor
        };

        const calculatedNextDue = computeNextDueSlot(now, schedule, timezone);

        const persistedNextDueMs = item.nextDueAt?.getTime() ?? null;
        const calculatedNextDueMs = calculatedNextDue?.getTime() ?? null;

        if (persistedNextDueMs !== calculatedNextDueMs) {
          refreshNextDueTasks.push(
            repo.updateScheduleNextDueAt(actor.accountId, item.scheduleId, calculatedNextDue)
          );
        }

        const slotsInWindow = computeMedicationSlots({
          schedule,
          windowStart: from,
          windowEnd: to,
          timezone
        });

        if (slotsInWindow.length === 0) {
          const delayedOnlySlots = delayedByOrderId.get(item.orderId) ?? [];
          if (delayedOnlySlots.length === 0) {
            continue;
          }
        }

        const candidateSlotsByKey = new Map<string, Date>();

        for (const slot of slotsInWindow) {
          const originalSlotKey = slotKey(item.orderId, slot);
          if (administeredSlots.has(originalSlotKey)) {
            continue;
          }

          const delayedUntil = delayedByOriginalSlot.get(originalSlotKey) ?? null;
          const effectiveSlot = delayedUntil ?? slot;

          if (!isWithinWindow(effectiveSlot, from, to)) {
            continue;
          }

          const effectiveSlotKey = slotKey(item.orderId, effectiveSlot);
          if (administeredSlots.has(effectiveSlotKey)) {
            continue;
          }

          candidateSlotsByKey.set(effectiveSlotKey, effectiveSlot);
        }

        for (const delayedUntil of delayedByOrderId.get(item.orderId) ?? []) {
          if (!isWithinWindow(delayedUntil, from, to)) {
            continue;
          }

          const delayedSlotKey = slotKey(item.orderId, delayedUntil);
          if (administeredSlots.has(delayedSlotKey)) {
            continue;
          }

          candidateSlotsByKey.set(delayedSlotKey, delayedUntil);
        }

        for (const slot of candidateSlotsByKey.values()) {

          const dueItem: DueDoseItem = {
            orderId: item.orderId,
            stayId: item.stayId,
            encounterId: item.encounterId,
            timezone,
            patient: {
              id: item.patientId,
              name: item.patientName
            },
            medication: {
              name: item.medicationName,
              doseValue: item.doseValue,
              doseUnit: item.doseUnit,
              route: item.route,
              frequencyType: item.frequencyType
            },
            scheduledFor: slot.toISOString(),
            nextDueAt: (calculatedNextDue ?? slot).toISOString()
          };

          if (slot.getTime() < now.getTime()) {
            overdue.push(dueItem);
          } else {
            upcoming.push(dueItem);
          }
        }
      }

      if (refreshNextDueTasks.length > 0) {
        await Promise.all(refreshNextDueTasks);
      }

      overdue.sort(sortByScheduledForAsc);
      upcoming.sort(sortByScheduledForAsc);

      return {
        now: now.toISOString(),
        windowMin: input.windowMin,
        overdue,
        upcoming,
        total: overdue.length + upcoming.length
      };
    }
  };
}
