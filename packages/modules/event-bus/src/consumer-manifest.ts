export const PRODUCTION_EVENT_CONSUMERS = ['payments', 'billing', 'webhooks'] as const;

export type ProductionEventConsumerName = typeof PRODUCTION_EVENT_CONSUMERS[number];

export function missingProductionConsumers(registered: readonly string[]): readonly string[] {
  return PRODUCTION_EVENT_CONSUMERS.filter((consumer) => !registered.includes(consumer));
}
