import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';

function mockJsonFor(url: string) {
  if (url.includes('/api/access-control')) {
    return {
      roles: [],
      permissions: [],
      teams: [],
      sectors: [],
      users: [],
      assignments: { userPermissions: [], teamPermissions: [], sectorPermissions: [] },
      memberships: { userTeams: [], userSectors: [] },
      legacyRoles: []
    };
  }

  if (url.includes('/api/audit/events')) {
    return { items: [] };
  }

  if (url.includes('/api/audit/operational-coverage')) {
    return {
      requirements: [],
      coveredRequirements: 0,
      missingRequirements: 0,
      coveragePercent: 100
    };
  }

  if (url.includes('/api/lgpd/consent/status')) {
    return { active: {} };
  }

  if (url.includes('/api/lgpd/requests')) {
    return { requests: [] };
  }

  if (url.includes('/api/owners')) {
    return { items: [] };
  }

  if (url.includes('/api/patients')) {
    return { items: [] };
  }

  if (url.includes('/api/master-search')) {
    return { owners: [], patients: [], links: [] };
  }

  if (url.includes('/api/health')) {
    return { ok: true, service: 'api', environment: 'test', version: '0.0.0', timestamp: '2026-04-22T00:00:00.000Z' };
  }

  if (url.includes('/api/slos')) {
    return {
      generatedAt: '2026-04-22T00:00:00.000Z',
      snapshot: {
        requestCount5m: 10,
        requestCount1h: 100,
        p95LatencyMs: 120,
        p99LatencyMs: 240,
        availabilityPercent: 99.9,
        errorRatePercent: 0.05
      },
      report: {
        overallStatus: 'healthy',
        errorBudgetExhausted: false,
        slos: [
          {
            id: 'api-availability',
            name: 'API Availability',
            category: 'availability',
            currentValue: 99.9,
            target: 99.5,
            unit: 'percent',
            status: 'healthy',
            errorBudgetPercent: 100,
            burnRate: 0.2,
            lastUpdated: '2026-04-22T00:00:00.000Z'
          }
        ]
      },
      runbook: { metrics: '/metrics', readiness: '/ready', liveness: '/live' }
    };
  }

  return [];
}

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  const json = mockJsonFor(url);
  return {
    ok: true,
    json: async () => json,
    text: async () => JSON.stringify(json)
  };
});

const pages = [
  {
    loader: () => import('../access-control/AccessControlPage.vue'),
    title: 'Governança de Acesso',
    breadcrumb: 'Console EnterpriseGovernançaGovernança de Acesso',
    evidence: 'Roles legadas'
  },
  {
    loader: () => import('../audit/AuditPage.vue'),
    title: 'Auditoria',
    breadcrumb: 'Console EnterpriseGovernançaAuditoria',
    evidence: 'Ações rápidas — controle e conformidade'
  },
  {
    loader: () => import('../lgpd/LgpdHubPage.vue'),
    title: 'LGPD',
    breadcrumb: 'Console EnterpriseGovernançaLGPD',
    evidence: 'Ações rápidas'
  },
  {
    loader: () => import('../api-client/ApiClientPage.vue'),
    title: 'Cliente API',
    breadcrumb: 'Console EnterpriseIntegraçõesCliente API',
    evidence: 'Health check'
  },
  {
    loader: () => import('../api-keys/ApiKeysPage.vue'),
    title: 'Chaves de API',
    breadcrumb: 'Console EnterpriseIntegraçõesChaves de API',
    evidence: 'Nova API Key'
  },
  {
    loader: () => import('../master-search/MasterSearchPage.vue'),
    title: 'Busca federada',
    breadcrumb: 'Console EnterpriseUtilidadesBusca Mestre',
    evidence: 'Buscar por tutor, paciente, documento, produto, comanda ou relação...'
  }
];

describe('Enterprise surfaces', () => {
  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  it.each(pages)('renders $title with explicit enterprise breadcrumbs', async ({ loader, title, breadcrumb }) => {
    const component = (await loader()).default;
    const wrapper = mount(component, {
      global: {
        plugins: [createPinia()]
      }
    });

    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain(breadcrumb.replace(/\s+/g, '').replace(/\//g, ''));
    expect(wrapper.text()).toContain(title);
  });

  it.each(pages)('exposes domain-specific starter evidence for $title', async ({ loader, evidence }) => {
    const component = (await loader()).default;
    const wrapper = mount(component, {
      global: {
        plugins: [createPinia()]
      }
    });

    if (evidence.includes('Buscar por tutor')) {
      expect(wrapper.find('input[type="search"]').attributes('placeholder')).toBe(evidence);
    } else {
      expect(wrapper.text()).toContain(evidence);
    }
  });
});
