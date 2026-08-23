import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

import { getSLOConfigs } from '../../../apps/api/src/slos.js';

describe('Prometheus alerts and SLO catalog stay aligned', () => {
  const alerts = readFileSync('infra/observability/prometheus-alerts.yml', 'utf8');
  const configs = Object.fromEntries(getSLOConfigs().map((config) => [config.id, config]));

  it('uses the same P95 alert and critical thresholds as the SLO catalog', () => {
    expect(alerts).toContain('> 0.25');
    expect(alerts).toContain('> 0.3');
    expect(configs['api-latency-p95']?.alertThreshold).toBe(250);
    expect(configs['api-latency-p95']?.criticalThreshold).toBe(300);
  });

  it('uses the same P99 alert and critical thresholds as the SLO catalog', () => {
    expect(alerts).toContain('> 0.6');
    expect(alerts).toContain('> 0.8');
    expect(configs['api-latency-p99']?.alertThreshold).toBe(600);
    expect(configs['api-latency-p99']?.criticalThreshold).toBe(800);
  });

  it('uses the same availability thresholds as the SLO catalog', () => {
    expect(alerts).toContain('< 99');
    expect(alerts).toContain('< 98');
    expect(configs['api-availability']?.alertThreshold).toBe(99);
    expect(configs['api-availability']?.criticalThreshold).toBe(98);
  });

  it('uses the same error-rate thresholds as the SLO catalog', () => {
    expect(alerts).toContain('> 0.005');
    expect(alerts).toContain('> 0.01');
    expect(configs['api-error-rate']?.alertThreshold).toBe(0.5);
    expect(configs['api-error-rate']?.criticalThreshold).toBe(1);
  });

  it('uses max aggregation for the replicated full-account PIX DLQ gauge', () => {
    expect(alerts).toContain(
      'expr: max(worker_pix_provider_settlement_reconciliation_required) > 0'
    );
    const dashboard = JSON.parse(
      readFileSync('infra/observability/grafana/cvg-his-v2-api-dashboard.json', 'utf8')
    ) as { readonly panels?: readonly { readonly targets?: readonly { readonly expr?: string }[] }[] };
    const pixPanel = dashboard.panels?.find((panel) =>
      panel.targets?.some((target) => target.expr?.includes('worker_pix_provider_settlement_reconciliation_required'))
    );
    expect(pixPanel?.targets?.[0]?.expr).toBe(
      'max(worker_pix_provider_settlement_reconciliation_required)'
    );
  });
});
