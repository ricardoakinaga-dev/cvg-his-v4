import type { ChaosEngine } from '@cvg-his-v2/chaos';

export function registerChaosExperimentOnce(
  chaos: ChaosEngine,
  experiment: { readonly id: string }
): void {
  const alreadyRegistered = chaos.listExperiments().some((item) => item.id === experiment.id);
  if (!alreadyRegistered) {
    chaos.register(experiment as never);
  }
}
