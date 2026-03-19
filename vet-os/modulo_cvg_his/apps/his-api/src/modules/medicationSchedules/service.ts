import type {
  MedicationScheduleCreateDto,
  MedicationScheduleType,
  MedicationScheduleUpdateDto
} from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import { calculateNextDueAt } from './calc.js';
import { resolveMedicationScheduleTimezone } from './timezone.js';
import {
  createMedicationSchedulesRepo,
  type MedicationOrderForSchedule,
  type MedicationScheduleRecord,
  type MedicationSchedulesRepo
} from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: MedicationSchedulesRepo;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

type EffectiveSchedule = {
  scheduleType: MedicationScheduleType;
  intervalMinutes: number | null;
  times: string[] | null;
};

type InvalidScheduleReason =
  | 'interval_minutes_required'
  | 'fixed_times_required';

export type CreateMedicationScheduleResult =
  | { kind: 'order_not_found' }
  | { kind: 'order_stopped' }
  | { kind: 'schedule_already_exists' }
  | { kind: 'invalid_schedule'; reason: InvalidScheduleReason }
  | { kind: 'created'; schedule: MedicationScheduleRecord };

export type UpdateMedicationScheduleResult =
  | { kind: 'order_not_found' }
  | { kind: 'order_stopped' }
  | { kind: 'schedule_not_found' }
  | { kind: 'invalid_schedule'; reason: InvalidScheduleReason }
  | { kind: 'updated'; schedule: MedicationScheduleRecord };

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

function ensureWriteActor(requestContext: RequestContext): WriteActor {
  const actor = ensureAccountActor(requestContext);

  if (!actor.userId) {
    throw unauthorizedError('Missing actor user context. Provide x-user-id header.');
  }

  return actor as WriteActor;
}

function validateScheduleConfig(config: EffectiveSchedule): { ok: true } | { ok: false; reason: InvalidScheduleReason } {
  if (config.scheduleType === 'interval') {
    if (!config.intervalMinutes || config.intervalMinutes <= 0) {
      return {
        ok: false,
        reason: 'interval_minutes_required'
      };
    }

    return { ok: true };
  }

  if (!config.times || config.times.length === 0) {
    return {
      ok: false,
      reason: 'fixed_times_required'
    };
  }

  return { ok: true };
}

function buildConfigFromCreate(payload: Omit<MedicationScheduleCreateDto, 'orderId'>): EffectiveSchedule {
  return {
    scheduleType: payload.scheduleType,
    intervalMinutes: payload.scheduleType === 'interval' ? payload.intervalMinutes ?? null : null,
    times: payload.scheduleType === 'fixed_times' ? payload.times ?? null : null
  };
}

function buildConfigFromUpdate(
  existing: {
    scheduleType: MedicationScheduleType;
    intervalMinutes: number | null;
    times: string[] | null;
  },
  patch: MedicationScheduleUpdateDto
): EffectiveSchedule {
  const scheduleType = patch.scheduleType ?? existing.scheduleType;
  const intervalMinutes =
    scheduleType === 'interval'
      ? patch.intervalMinutes !== undefined
        ? patch.intervalMinutes
        : existing.intervalMinutes
      : null;
  const times =
    scheduleType === 'fixed_times'
      ? patch.times !== undefined
        ? patch.times
        : existing.times
      : null;

  return {
    scheduleType,
    intervalMinutes: intervalMinutes ?? null,
    times: times ?? null
  };
}

function calculateFromOrder(
  order: MedicationOrderForSchedule,
  config: EffectiveSchedule,
  lastScheduledFor: Date | null
): Date | null {
  const timezone = resolveMedicationScheduleTimezone({
    accountId: order.accountId,
    wardId: order.wardId
  });

  return calculateNextDueAt({
    scheduleType: config.scheduleType,
    intervalMinutes: config.intervalMinutes,
    times: config.times,
    orderStartAt: order.startAt,
    orderEndAt: order.endAt,
    lastScheduledFor,
    now: new Date(),
    timezone
  });
}

export function createMedicationSchedulesService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createMedicationSchedulesRepo(context.db);

  return {
    async create(
      orderId: string,
      payload: Omit<MedicationScheduleCreateDto, 'orderId'>
    ): Promise<CreateMedicationScheduleResult> {
      const actor = ensureWriteActor(context.requestContext);
      const order = await repo.findOrderInAccount(actor.accountId, orderId);

      if (!order) {
        return { kind: 'order_not_found' };
      }

      if (order.status !== 'active') {
        return { kind: 'order_stopped' };
      }

      const existing = await repo.findScheduleByOrderId(actor.accountId, orderId);
      if (existing) {
        return { kind: 'schedule_already_exists' };
      }

      const config = buildConfigFromCreate(payload);
      const validation = validateScheduleConfig(config);
      if (!validation.ok) {
        return {
          kind: 'invalid_schedule',
          reason: validation.reason
        };
      }

      const lastScheduledFor = await repo.findLastScheduledFor(actor.accountId, orderId);
      const nextDueAt = calculateFromOrder(order, config, lastScheduledFor);

      const schedule = await repo.createSchedule({
        accountId: actor.accountId,
        orderId,
        scheduleType: config.scheduleType,
        intervalMinutes: config.intervalMinutes,
        times: config.times,
        nextDueAt
      });

      return {
        kind: 'created',
        schedule
      };
    },

    async update(
      orderId: string,
      patch: MedicationScheduleUpdateDto
    ): Promise<UpdateMedicationScheduleResult> {
      const actor = ensureWriteActor(context.requestContext);
      const order = await repo.findOrderInAccount(actor.accountId, orderId);

      if (!order) {
        return { kind: 'order_not_found' };
      }

      if (order.status !== 'active') {
        return { kind: 'order_stopped' };
      }

      const existing = await repo.findScheduleByOrderId(actor.accountId, orderId);
      if (!existing) {
        return { kind: 'schedule_not_found' };
      }

      const config = buildConfigFromUpdate(
        {
          scheduleType: existing.scheduleType,
          intervalMinutes: existing.intervalMinutes,
          times: existing.times
        },
        patch
      );
      const validation = validateScheduleConfig(config);
      if (!validation.ok) {
        return {
          kind: 'invalid_schedule',
          reason: validation.reason
        };
      }

      const lastScheduledFor = await repo.findLastScheduledFor(actor.accountId, orderId);
      const nextDueAt = calculateFromOrder(order, config, lastScheduledFor);

      const schedule = await repo.updateScheduleByOrderId({
        accountId: actor.accountId,
        orderId,
        scheduleType: config.scheduleType,
        intervalMinutes: config.intervalMinutes,
        times: config.times,
        nextDueAt
      });

      if (!schedule) {
        return { kind: 'schedule_not_found' };
      }

      return {
        kind: 'updated',
        schedule
      };
    }
  };
}
