import { BillingService } from '@cvg-his-v2/module-billing';
import { ConsumerRegistry } from '@cvg-his-v2/module-event-consumers';
import {
  PaymentsEventHandlers,
  BillingEventHandlers,
  WebhooksEventHandlers
} from '@cvg-his-v2/module-event-consumers';
import type { EncounterFinancialService } from '@cvg-his-v2/module-financial';
import type {
  CardTransactionRepository,
  PixTransactionRepository
} from '@cvg-his-v2/module-payments';
import type { WebhooksService } from '@cvg-his-v2/module-webhooks';
import type { EventBusService } from '@cvg-his-v2/module-event-bus';
import type { AccountId } from '@cvg-his-v2/shared-types';

export const WORKER_EVENT_CONSUMER_NAMES = Object.freeze([
  'payments',
  'billing',
  'webhooks'
] as const);

export interface WorkerEventConsumerDependencies {
  readonly billing: BillingService;
  readonly encounterFinancial: EncounterFinancialService;
  readonly pixTransactions: PixTransactionRepository;
  readonly cardTransactions: CardTransactionRepository;
  readonly webhooks: WebhooksService;
  readonly hydrateAccount?: (accountId: AccountId) => Promise<void>;
}

export interface WorkerEventConsumerRuntime {
  readonly registry: ConsumerRegistry;
  readonly hydrateAccount: (accountId: AccountId) => Promise<void>;
  readonly register: (eventBus: EventBusService) => void;
}

export function createWorkerEventConsumerRuntime(
  dependencies: WorkerEventConsumerDependencies
): WorkerEventConsumerRuntime {
  const registry = new ConsumerRegistry();
  registry.add(
    'payments',
    new PaymentsEventHandlers({
      billing: dependencies.billing,
      encounterFinancial: dependencies.encounterFinancial,
      pixTransactions: dependencies.pixTransactions,
      cardTransactions: dependencies.cardTransactions
    })
  );
  registry.add('billing', new BillingEventHandlers({ billing: dependencies.billing }));
  registry.add('webhooks', new WebhooksEventHandlers({ webhooks: dependencies.webhooks }));

  const hydrateAccount = dependencies.hydrateAccount ?? (async () => undefined);
  return Object.freeze({
    registry,
    hydrateAccount,
    register: (eventBus: EventBusService) => registry.registerAll(eventBus)
  });
}

export function registerWorkerEventConsumers(
  eventBus: EventBusService,
  dependencies: WorkerEventConsumerDependencies
): WorkerEventConsumerRuntime {
  const runtime = createWorkerEventConsumerRuntime(dependencies);
  runtime.register(eventBus);
  return runtime;
}
