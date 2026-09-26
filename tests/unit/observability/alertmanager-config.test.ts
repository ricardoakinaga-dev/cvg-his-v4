import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');
const alertmanager = YAML.parse(read('infra/observability/alertmanager.yml'));
const prometheus = YAML.parse(read('infra/observability/prometheus.yml'));
const rules = YAML.parse(read('infra/observability/prometheus-alerts.yml'));
const compose = read('docker-compose.v2.yml');

type Route = { receiver?: string; matchers?: string[]; routes?: Route[] };

function severityRoutes(route: Route): Map<string, string> {
  const found = new Map<string, string>();
  for (const child of route.routes ?? []) {
    for (const matcher of child.matchers ?? []) {
      const match = matcher.match(/^severity\s*=\s*"?([a-z]+)"?$/);
      if (match && child.receiver) found.set(match[1], child.receiver);
    }
  }
  return found;
}

describe('Alertmanager routing (R2-OPS-01)', () => {
  it('routes every severity used by the Prometheus rules to a named receiver', () => {
    const severities = new Set<string>();
    for (const group of rules.groups ?? []) {
      for (const rule of group.rules ?? []) {
        if (rule.alert) severities.add(String(rule.labels?.severity));
      }
    }
    expect(severities.size).toBeGreaterThan(0);
    const routed = severityRoutes(alertmanager.route);
    for (const severity of severities) expect(routed.get(severity), `route for severity=${severity}`).toBeDefined();
    expect(routed.get('critical')).toBe('critical-pager');
    expect(routed.get('warning')).toBe('warning-chat');
    expect(alertmanager.route.receiver).toBe('warning-chat');
  });

  it('pages critical alerts faster and more often than warnings', () => {
    const critical = (alertmanager.route.routes as Route[]).find((route) => route.receiver === 'critical-pager') as Record<
      string,
      string
    >;
    expect(critical.group_wait).toBe('10s');
    expect(critical.repeat_interval).toBe('1h');
    expect(alertmanager.route.repeat_interval).toBe('4h');
  });

  it('keeps receiver destinations in mounted secret files, never inline', () => {
    const receivers = alertmanager.receivers as Array<{ name: string; webhook_configs?: Array<Record<string, unknown>> }>;
    expect(receivers.map((receiver) => receiver.name).sort()).toEqual(['critical-pager', 'warning-chat']);
    for (const receiver of receivers) {
      expect(receiver.webhook_configs?.length).toBe(1);
      const [config] = receiver.webhook_configs ?? [];
      expect(config.url).toBeUndefined();
      expect(String(config.url_file)).toMatch(/^\/etc\/alertmanager\/secrets\//);
      expect(config.send_resolved).toBe(true);
    }
    expect(read('infra/observability/alertmanager.yml')).not.toMatch(/https?:\/\/hooks\.|api_url:|password:/);
  });

  it('inhibits warnings while the same service pages critical', () => {
    const [rule] = alertmanager.inhibit_rules;
    expect(rule.source_matchers).toContain('severity = critical');
    expect(rule.target_matchers).toContain('severity = warning');
    expect(rule.equal).toEqual(['service', 'environment']);
  });

  it('is wired into Prometheus and the observability compose profile', () => {
    const targets = prometheus.alerting.alertmanagers.flatMap((entry: { static_configs: Array<{ targets: string[] }> }) =>
      entry.static_configs.flatMap((config) => config.targets)
    );
    expect(targets).toContain('alertmanager:9093');
    expect(compose).toMatch(/alertmanager:\n\s+#.*\n\s+#.*\n\s+image: prom\/alertmanager@sha256:[a-f0-9]{64}/);
    expect(compose).toContain('ALERTMANAGER_CRITICAL_WEBHOOK_URL_FILE');
    expect(compose).toContain('ALERTMANAGER_WARNING_WEBHOOK_URL_FILE');
    expect(compose).toContain('./infra/observability/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro');
  });
});
